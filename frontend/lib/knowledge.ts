import type { ApiFn } from "./api";
import type { KnowledgeCategory } from "./constants";
import type { ItemResponse, KnowledgeEntry, ListResponse, Tag } from "./types";

/** Filtros de `GET /api/v1/knowledge`. */
export interface KnowledgeListParams {
  q?: string;
  category?: KnowledgeCategory;
  tag?: string;
  page?: number;
  pageSize?: number;
}

/** Cuerpo de crear/actualizar una entrada. */
export interface KnowledgeInput {
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
}

/** Construye un querystring omitiendo los valores vacíos/indefinidos. */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listKnowledge(
  api: ApiFn,
  params: KnowledgeListParams,
  signal?: AbortSignal,
): Promise<ListResponse<KnowledgeEntry>> {
  return api<ListResponse<KnowledgeEntry>>(`/api/v1/knowledge${buildQuery({ ...params })}`, {
    signal,
  });
}

export function getKnowledge(
  api: ApiFn,
  id: string,
  signal?: AbortSignal,
): Promise<ItemResponse<KnowledgeEntry>> {
  return api<ItemResponse<KnowledgeEntry>>(`/api/v1/knowledge/${id}`, { signal });
}

export function createKnowledge(
  api: ApiFn,
  input: KnowledgeInput,
): Promise<ItemResponse<KnowledgeEntry>> {
  return api<ItemResponse<KnowledgeEntry>>("/api/v1/knowledge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateKnowledge(
  api: ApiFn,
  id: string,
  input: KnowledgeInput,
): Promise<ItemResponse<KnowledgeEntry>> {
  return api<ItemResponse<KnowledgeEntry>>(`/api/v1/knowledge/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteKnowledge(api: ApiFn, id: string): Promise<null> {
  return api<null>(`/api/v1/knowledge/${id}`, { method: "DELETE" });
}

export function listTags(api: ApiFn, signal?: AbortSignal): Promise<ItemResponse<Tag[]>> {
  return api<ItemResponse<Tag[]>>("/api/v1/tags", { signal });
}
