import type { KnowledgeEntry, Project, Tag } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export interface SearchParams {
  userId: bigint;
  q: string;
  type: "all" | "knowledge" | "projects";
  page: number;
  pageSize: number;
}

export interface SearchResultItem {
  kind: "knowledge" | "project";
  id: bigint;
  title: string;
  snippet: string;
  url?: string;
  category?: string;
  status?: string;
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

function snippet(text: string | null | undefined, q: string, length = 160): string {
  if (!text) {
    return "";
  }
  const lower = text.toLowerCase();
  const query = q.toLowerCase();
  const index = lower.indexOf(query);
  if (index === -1) {
    return text.length <= length ? text : `${text.slice(0, length).trim()}…`;
  }
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + query.length + 80);
  const slice = text.slice(start, end);
  const prefix = start > 0 ? "… " : "";
  const suffix = end < text.length ? " …" : "";
  return `${prefix}${slice.trim()}${suffix}`;
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
}

export function createSearchRepository(): SearchRepository {
  return {
    async search(params) {
      const { userId, q, type, page, pageSize } = params;
      const offset = (page - 1) * pageSize;
      const query = q.trim();

      const items: SearchResultItem[] = [];
      let total = 0;

      if (type === "all" || type === "knowledge") {
        const where = {
          userId,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
            { tags: { some: { tag: { name: { contains: query.toLowerCase() } } } } },
          ],
        };
        const [rows, count] = await Promise.all([
          prisma.knowledgeEntry.findMany({
            where,
            include: { tags: { include: { tag: true } } },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: offset,
            take: pageSize,
          }),
          prisma.knowledgeEntry.count({ where }),
        ]);
        total += count;
        for (const row of rows) {
          items.push({
            kind: "knowledge",
            id: row.id,
            title: row.title,
            snippet: snippet(row.content, query),
            category: row.category,
            tags: row.tags.map((t: { tag: Tag }) => t.tag.name),
            updatedAt: row.updatedAt,
            createdAt: row.createdAt,
          });
        }
      }

      if (type === "all" || type === "projects") {
        const where = {
          userId,
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
            { technologies: { some: { name: { contains: query.toLowerCase() } } } },
          ],
        };
        const [rows, count] = await Promise.all([
          prisma.project.findMany({
            where,
            include: { technologies: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: offset,
            take: pageSize,
          }),
          prisma.project.count({ where }),
        ]);
        total = type === "projects" ? count : total + count;
        for (const row of rows) {
          items.push({
            kind: "project",
            id: row.id,
            title: row.name,
            snippet: snippet(row.description, query),
            status: row.status,
            url: row.url ?? undefined,
            tags: row.technologies.map((t: { projectId: bigint; name: string }) => t.name),
            updatedAt: row.updatedAt,
            createdAt: row.createdAt,
          });
        }
      }

      if (type === "all") {
        items.sort((a, b) => {
          if (b.updatedAt.getTime() !== a.updatedAt.getTime()) {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
          return Number(b.id) - Number(a.id);
        });
        items.splice(pageSize);
        total = Math.max(
          type === "all"
            ? ((await prisma.knowledgeEntry.count({
                where: {
                  userId,
                  OR: [
                    { title: { contains: query } },
                    { content: { contains: query } },
                    { tags: { some: { tag: { name: { contains: query.toLowerCase() } } } } },
                  ],
                },
              })) as number) +
                ((await prisma.project.count({
                  where: {
                    userId,
                    OR: [
                      { name: { contains: query } },
                      { description: { contains: query } },
                      { technologies: { some: { name: { contains: query.toLowerCase() } } } },
                    ],
                  },
                })) as number)
            : total,
          items.length,
        );
      }

      return { items, total, page, pageSize };
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
  };
}
