import type {
  Prisma,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  endOfDayInTimeZone,
  formatDateInTimeZone,
  resolveTimeZone,
  startOfDayInTimeZone,
} from "../lib/timezone.js";

/** Tarea con su proyecto (opcional) resuelto. */
export type TaskWithProject = Task & { project: Project | null };

export interface ListTasksParams {
  userId: bigint;
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: bigint;
  from?: Date;
  to?: Date;
  overdue?: boolean;
  dueToday?: boolean;
  /** Zona horaria IANA del cliente para calcular «hoy» y agrupar por día. */
  timeZone?: string;
  page: number;
  pageSize: number;
}

export interface CreateTaskData {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  projectId: bigint | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: Date | null;
  projectId?: bigint | null;
}

/** Conteo de tareas pendientes por día (`YYYY-MM-DD`). */
export interface TaskDayCount {
  date: string;
  count: number;
}

/** Acceso a `tasks`. Todas las consultas filtran por `userId`. */
export interface TaskRepository {
  list(params: ListTasksParams): Promise<{ items: TaskWithProject[]; total: number }>;
  /** Conteo de tareas pendientes agrupadas por día (para los puntos del calendario). */
  groupByDay(params: Omit<ListTasksParams, "page" | "pageSize">): Promise<TaskDayCount[]>;
  findById(userId: bigint, id: bigint): Promise<TaskWithProject | null>;
  create(userId: bigint, data: CreateTaskData): Promise<TaskWithProject>;
  update(userId: bigint, id: bigint, data: UpdateTaskData): Promise<TaskWithProject | null>;
  delete(userId: bigint, id: bigint): Promise<boolean>;
}

/** Inclusión estándar para devolver cada tarea con su proyecto. */
const projectInclude = { project: true } satisfies Prisma.TaskInclude;

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Clave de día `YYYY-MM-DD` en la zona local del servidor. */
function serverLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Clave de día `YYYY-MM-DD` en la zona del cliente, con respaldo en la del servidor. */
function dayKey(date: Date, timeZone: string | undefined): string {
  return timeZone ? formatDateInTimeZone(date, timeZone) : serverLocalDayKey(date);
}

/**
 * Construye el filtro de `dueAt` a partir de los parámetros.
 *
 * `overdue` y `dueToday` tienen prioridad sobre `from`/`to` porque ambos
 * acotan el rango a «ahora» o a «hoy» respectivamente. `overdue` compara con
 * el instante actual (es independiente de la zona horaria); `dueToday` usa la
 * zona del cliente para que «hoy» signifique el día local del usuario.
 */
function buildDueAtFilter(
  params: Pick<ListTasksParams, "overdue" | "dueToday" | "from" | "to" | "timeZone">,
): Prisma.DateTimeNullableFilter | undefined {
  if (params.overdue) {
    return { lt: new Date() };
  }
  if (params.dueToday) {
    const timeZone = resolveTimeZone(params.timeZone);
    if (timeZone) {
      const now = new Date();
      return { gte: startOfDayInTimeZone(now, timeZone), lte: endOfDayInTimeZone(now, timeZone) };
    }
    return { gte: startOfToday(), lte: endOfToday() };
  }
  if (params.from || params.to) {
    return {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }
  return undefined;
}

/** Implementación sobre Prisma. */
export function createTaskRepository(): TaskRepository {
  return {
    async list(params) {
      const dueAt = buildDueAtFilter(params);
      const where: Prisma.TaskWhereInput = {
        userId: params.userId,
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.q
          ? { OR: [{ title: { contains: params.q } }, { description: { contains: params.q } }] }
          : {}),
        ...(dueAt ? { dueAt } : {}),
        // `overdue` y `dueToday` solo consideran tareas pendientes.
        ...(params.overdue || params.dueToday
          ? { status: "PENDING" as TaskStatus }
          : params.status
            ? { status: params.status }
            : {}),
      };

      const [items, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: projectInclude,
          orderBy: [{ dueAt: "asc" }, { id: "desc" }],
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.task.count({ where }),
      ]);

      return { items, total };
    },

    async groupByDay(params) {
      const dueAt = buildDueAtFilter(params);
      const timeZone = resolveTimeZone(params.timeZone);
      const where: Prisma.TaskWhereInput = {
        userId: params.userId,
        status: "PENDING",
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.q
          ? { OR: [{ title: { contains: params.q } }, { description: { contains: params.q } }] }
          : {}),
        dueAt: dueAt ? { not: null, ...dueAt } : { not: null },
      };

      const rows = await prisma.task.findMany({
        where,
        select: { dueAt: true },
        orderBy: { dueAt: "asc" },
      });

      const counts = new Map<string, number>();
      for (const { dueAt: value } of rows) {
        if (!value) continue;
        const key = dayKey(value, timeZone);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
    },

    async findById(userId, id) {
      return prisma.task.findFirst({
        where: { id, userId },
        include: projectInclude,
      });
    },

    async create(userId, data) {
      return prisma.task.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueAt: data.dueAt,
          projectId: data.projectId,
        },
        include: projectInclude,
      });
    },

    async update(userId, id, data) {
      const existing = await prisma.task.findFirst({ where: { id, userId } });
      if (!existing) {
        return null;
      }

      const update: Prisma.TaskUncheckedUpdateInput = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      };

      if (data.status !== undefined) {
        update.status = data.status;
        // Sella o limpia `completedAt` según la transición de estado.
        update.completedAt =
          data.status === "COMPLETED" ? (existing.completedAt ?? new Date()) : null;
      }

      return prisma.task.update({
        where: { id },
        data: update,
        include: projectInclude,
      });
    },

    async delete(userId, id) {
      const result = await prisma.task.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },
  };
}
