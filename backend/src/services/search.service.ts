import type { KnowledgeEntry, Project } from "../generated/prisma/client.js";
import {
  createSearchRepository,
  type DashboardMetrics,
  type SearchRepository,
} from "../repositories/search.repository.js";
import type { SearchQuery } from "../schemas/search.schema.js";

export interface SearchResultItemDto {
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

export interface SearchResultDto {
  items: SearchResultItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardKnowledgeItem {
  id: bigint;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardProjectItem {
  id: bigint;
  name: string;
  description: string | null;
  status: string;
  url: string | null;
  repositoryUrl: string | null;
  technologies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardDto {
  recentKnowledge: DashboardKnowledgeItem[];
  recentProjects: DashboardProjectItem[];
}

/** Métricas agregadas del panel (F11.3). */
export type DashboardMetricsDto = DashboardMetrics;

export interface SearchService {
  search(userId: bigint, query: SearchQuery): Promise<SearchResultDto>;
  dashboard(userId: bigint, limit?: number): Promise<DashboardDto>;
  metrics(userId: bigint, months?: number, timeZone?: string): Promise<DashboardMetricsDto>;
}

export function createSearchService(
  repository: SearchRepository = createSearchRepository(),
): SearchService {
  return {
    async search(userId, query) {
      const result = await repository.search({
        userId,
        q: query.q,
        type: query.type as "all" | "knowledge" | "projects",
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        items: result.items.map((item) => ({
          kind: item.kind,
          id: item.id,
          title: item.title,
          snippet: item.snippet,
          url: item.url,
          category: item.category,
          status: item.status,
          tags: item.tags,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };
    },

    async dashboard(userId, limit = 5) {
      const data = await repository.dashboard(userId, limit);

      return {
        recentKnowledge: data.recentKnowledge.map(
          (
            k: KnowledgeEntry & {
              tags: { tag?: { id: bigint; name: string; createdAt: Date }; name?: string }[];
            },
          ) => ({
            id: k.id,
            title: k.title,
            content: k.content,
            category: k.category,
            tags: (k.tags || []).map(
              (t: { tag?: { id: bigint; name: string; createdAt: Date }; name?: string }) =>
                t.tag ? t.tag.name : (t.name ?? ""),
            ),
            createdAt: k.createdAt,
            updatedAt: k.updatedAt,
          }),
        ),
        recentProjects: data.recentProjects.map(
          (p: Project & { technologies: { projectId: bigint; name: string }[] }) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            url: p.url,
            repositoryUrl: p.repositoryUrl,
            technologies: (p.technologies || []).map(
              (t: { projectId: bigint; name: string }) => t.name,
            ),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }),
        ),
      };
    },

    async metrics(userId, months = 6, timeZone) {
      return repository.metrics(userId, months, timeZone);
    },
  };
}
