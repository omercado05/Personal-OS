import type { KnowledgeEntry, Project, Tag } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { everyTermMatches, searchTerms } from "../lib/text-search.js";
import {
  datePartsInTimeZone,
  endOfDayInTimeZone,
  formatDateInTimeZone,
  resolveTimeZone,
  startOfDayInTimeZone,
  zonedMidnight,
} from "../lib/timezone.js";

export interface SearchParams {
  userId: bigint;
  q: string;
  type: "all" | "knowledge" | "projects" | "tasks";
  page: number;
  pageSize: number;
}

export interface SearchResultItem {
  kind: "knowledge" | "project" | "task";
  id: bigint;
  title: string;
  snippet: string;
  url?: string;
  category?: string;
  status?: string;
  dueAt?: Date;
  tags: string[];
  updatedAt: Date;
  createdAt: Date;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Clave de mes `YYYY-MM` (en hora local del servidor) para agrupar actividad. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Inicio del día local del servidor. */
function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Fin del día local del servidor. */
function endOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Pliega un carácter (sin mayúsculas ni tilde) conservando la longitud del texto.
 * La ñ es una letra propia, no una n con tilde: se conserva, igual que la
 * intercalación `utf8mb4_es_0900_ai_ci` de la base de datos.
 */
function foldChar(char: string): string {
  if (char === "ñ" || char === "Ñ") {
    return "ñ";
  }
  const folded = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return folded.length === char.length ? folded : char;
}

/** Texto sin distinguir mayúsculas ni tildes; mantiene los índices del original. */
function fold(text: string): string {
  return Array.from(text, foldChar).join("");
}

/** `foldedTerms` ya vienen plegados con `fold` (se pliegan una vez por búsqueda). */
function snippet(text: string | null | undefined, foldedTerms: string[], length = 160): string {
  if (!text) {
    return "";
  }
  const folded = fold(text);
  let index = -1;
  let matchLength = 0;
  for (const term of foldedTerms) {
    const found = folded.indexOf(term);
    if (found !== -1 && (index === -1 || found < index)) {
      index = found;
      matchLength = term.length;
    }
  }
  if (index === -1) {
    return text.length <= length ? text : `${text.slice(0, length).trim()}…`;
  }
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + matchLength + 80);
  const slice = text.slice(start, end);
  const prefix = start > 0 ? "… " : "";
  const suffix = end < text.length ? " …" : "";
  return `${prefix}${slice.trim()}${suffix}`;
}

/** Orden por `updatedAt` desc y, en empate, por `id` desc (comparando bigint sin `Number`). */
function compareByRecency(a: SearchResultItem, b: SearchResultItem): number {
  const byDate = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (byDate !== 0) {
    return byDate;
  }
  if (a.id === b.id) {
    return 0;
  }
  return b.id > a.id ? 1 : -1;
}

export interface DashboardMetrics {
  totals: { knowledge: number; projects: number; tags: number; categories: number };
  knowledgeByCategory: { category: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  activity: { month: string; knowledge: number; projects: number }[];
  /** Tareas pendientes que vencen hoy. */
  tasksDueToday: number;
  /** Tareas pendientes vencidas (antes de ahora). */
  tasksOverdue: number;
}

export interface SearchRepository {
  search(params: SearchParams): Promise<SearchResult>;
  dashboard(
    userId: bigint,
    limit: number,
  ): Promise<{
    recentKnowledge: (KnowledgeEntry & { tags: { tag: Tag }[] })[];
    recentProjects: (Project & { technologies: { projectId: bigint; name: string }[] })[];
  }>;
  metrics(userId: bigint, months: number, timeZone?: string): Promise<DashboardMetrics>;
}

export function createSearchRepository(): SearchRepository {
  return {
    async search(params) {
      const { userId, q, type, page, pageSize } = params;
      const offset = (page - 1) * pageSize;
      const terms = searchTerms(q);
      const foldedTerms = terms.map(fold);
      const includeKnowledge = type === "all" || type === "knowledge";
      const includeProjects = type === "all" || type === "projects";
      const includeTasks = type === "all" || type === "tasks";
      // Con "all" el offset se aplica sobre la lista combinada: cada tabla aporta
      // sus primeros `offset + pageSize` resultados, se mezclan y se corta la página.
      const window =
        type === "all" ? { skip: 0, take: offset + pageSize } : { skip: offset, take: pageSize };
      const orderBy = [{ updatedAt: "desc" as const }, { id: "desc" as const }];

      const knowledgeWhere = {
        userId,
        ...everyTermMatches(terms, (term) => [
          { title: { contains: term } },
          { content: { contains: term } },
          { tags: { some: { tag: { name: { contains: term.toLowerCase() } } } } },
        ]),
      };
      const projectWhere = {
        userId,
        ...everyTermMatches(terms, (term) => [
          { name: { contains: term } },
          { description: { contains: term } },
          { technologies: { some: { name: { contains: term.toLowerCase() } } } },
        ]),
      };
      const taskWhere = {
        userId,
        ...everyTermMatches(terms, (term) => [
          { title: { contains: term } },
          { description: { contains: term } },
        ]),
      };

      const [knowledgeRows, knowledgeCount, projectRows, projectCount, taskRows, taskCount] =
        await Promise.all([
          includeKnowledge
            ? prisma.knowledgeEntry.findMany({
                where: knowledgeWhere,
                include: { tags: { include: { tag: true } } },
                orderBy,
                ...window,
              })
            : [],
          includeKnowledge ? prisma.knowledgeEntry.count({ where: knowledgeWhere }) : 0,
          includeProjects
            ? prisma.project.findMany({
                where: projectWhere,
                include: { technologies: true },
                orderBy,
                ...window,
              })
            : [],
          includeProjects ? prisma.project.count({ where: projectWhere }) : 0,
          includeTasks ? prisma.task.findMany({ where: taskWhere, orderBy, ...window }) : [],
          includeTasks ? prisma.task.count({ where: taskWhere }) : 0,
        ]);

      const items: SearchResultItem[] = [
        ...knowledgeRows.map((row): SearchResultItem => ({
          kind: "knowledge",
          id: row.id,
          title: row.title,
          snippet: snippet(row.content, foldedTerms),
          category: row.category,
          tags: row.tags.map((t) => t.tag.name),
          updatedAt: row.updatedAt,
          createdAt: row.createdAt,
        })),
        ...projectRows.map((row): SearchResultItem => ({
          kind: "project",
          id: row.id,
          title: row.name,
          snippet: snippet(row.description, foldedTerms),
          status: row.status,
          url: row.url ?? undefined,
          tags: row.technologies.map((t) => t.name),
          updatedAt: row.updatedAt,
          createdAt: row.createdAt,
        })),
        ...taskRows.map((row): SearchResultItem => ({
          kind: "task",
          id: row.id,
          title: row.title,
          snippet: snippet(row.description, foldedTerms),
          status: row.status,
          dueAt: row.dueAt ?? undefined,
          tags: [],
          updatedAt: row.updatedAt,
          createdAt: row.createdAt,
        })),
      ];

      // Con un solo tipo, la base de datos ya devolvió la página ordenada.
      const pageItems =
        type === "all" ? items.sort(compareByRecency).slice(offset, offset + pageSize) : items;

      return { items: pageItems, total: knowledgeCount + projectCount + taskCount, page, pageSize };
    },

    async dashboard(userId, limit) {
      const [recentKnowledge, recentProjects] = await Promise.all([
        prisma.knowledgeEntry.findMany({
          where: { userId },
          include: { tags: { include: { tag: true } } },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: limit,
        }),
        prisma.project.findMany({
          where: { userId },
          include: { technologies: true },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: limit,
        }),
      ]);

      return { recentKnowledge, recentProjects };
    },

    async metrics(userId, months, timeZoneParam) {
      const now = new Date();
      const timeZone = resolveTimeZone(timeZoneParam);
      // Los meses se cuentan en la zona del cliente; sin ella, en la del servidor.
      const monthOf = (date: Date) =>
        timeZone ? formatDateInTimeZone(date, timeZone).slice(0, 7) : monthKey(date);
      const { year, month } = timeZone
        ? datePartsInTimeZone(now, timeZone)
        : { year: now.getFullYear(), month: now.getMonth() + 1 };
      // Índice (base 0, puede ser negativo) del primer mes de la ventana:
      // (month - 1) - (months - 1).
      const firstMonthIndex = month - months;
      const start = timeZone
        ? zonedMidnight(year, firstMonthIndex, 1, timeZone)
        : new Date(year, firstMonthIndex, 1);

      const [
        knowledgeTotal,
        projectTotal,
        tagTotal,
        byCategory,
        byStatus,
        knowledgeDates,
        projectDates,
      ] = await Promise.all([
        prisma.knowledgeEntry.count({ where: { userId } }),
        prisma.project.count({ where: { userId } }),
        // Tags usados por este usuario (la tabla `tags` es global).
        prisma.tag.count({ where: { knowledgeEntries: { some: { knowledgeEntry: { userId } } } } }),
        prisma.knowledgeEntry.groupBy({
          by: ["category"],
          where: { userId },
          _count: { _all: true },
        }),
        prisma.project.groupBy({
          by: ["status"],
          where: { userId },
          _count: { _all: true },
        }),
        prisma.knowledgeEntry.findMany({
          where: { userId, createdAt: { gte: start } },
          select: { createdAt: true },
        }),
        prisma.project.findMany({
          where: { userId, createdAt: { gte: start } },
          select: { createdAt: true },
        }),
      ]);

      // Un cubo por mes (incluido el actual), para que los meses vacíos aparezcan.
      const buckets = new Map<string, { knowledge: number; projects: number }>();
      for (let index = 0; index < months; index += 1) {
        // Date.UTC solo normaliza año/mes; la clave YYYY-MM no depende de ninguna zona.
        const key = new Date(Date.UTC(year, firstMonthIndex + index, 1)).toISOString().slice(0, 7);
        buckets.set(key, { knowledge: 0, projects: 0 });
      }
      for (const row of knowledgeDates) {
        const bucket = buckets.get(monthOf(row.createdAt));
        if (bucket) {
          bucket.knowledge += 1;
        }
      }
      for (const row of projectDates) {
        const bucket = buckets.get(monthOf(row.createdAt));
        if (bucket) {
          bucket.projects += 1;
        }
      }

      const todayStart = timeZone ? startOfDayInTimeZone(now, timeZone) : startOfLocalDay(now);
      const todayEnd = timeZone ? endOfDayInTimeZone(now, timeZone) : endOfLocalDay(now);
      const [tasksDueToday, tasksOverdue] = await Promise.all([
        prisma.task.count({
          where: { userId, status: "PENDING", dueAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.task.count({ where: { userId, status: "PENDING", dueAt: { lt: now } } }),
      ]);
      return {
        totals: {
          knowledge: knowledgeTotal,
          projects: projectTotal,
          tags: tagTotal,
          categories: byCategory.length,
        },
        knowledgeByCategory: byCategory
          .map((row) => ({ category: row.category, count: row._count._all }))
          .sort((a, b) => b.count - a.count),
        projectsByStatus: byStatus
          .map((row) => ({ status: row.status, count: row._count._all }))
          .sort((a, b) => b.count - a.count),
        activity: [...buckets.entries()].map(([month, value]) => ({
          month,
          knowledge: value.knowledge,
          projects: value.projects,
        })),
        tasksDueToday,
        tasksOverdue,
      };
    },
  };
}
