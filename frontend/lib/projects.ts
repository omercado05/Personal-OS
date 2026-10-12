import type { ApiFn } from "./api";
import type { ProjectStatus } from "./constants";
import { buildQuery } from "./knowledge";
import type { ItemResponse, ListResponse, Project } from "./types";

/** Filtros de `GET /api/v1/projects`. */
export interface ProjectListParams {
  q?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
}

/** Cuerpo de crear/actualizar un proyecto. */
export interface ProjectInput {
  name: string;
  description: string | null;
  status: ProjectStatus;
  url: string | null;
  repositoryUrl: string | null;
  technologies: string[];
}

export function listProjects(
  api: ApiFn,
  params: ProjectListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Project>> {
  return api<ListResponse<Project>>(`/api/v1/projects${buildQuery({ ...params })}`, { signal });
}

export function getProject(
  api: ApiFn,
  id: string,
  signal?: AbortSignal,
): Promise<ItemResponse<Project>> {
  return api<ItemResponse<Project>>(`/api/v1/projects/${id}`, { signal });
}

export function createProject(api: ApiFn, input: ProjectInput): Promise<ItemResponse<Project>> {
  return api<ItemResponse<Project>>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(
  api: ApiFn,
  id: string,
  input: ProjectInput,
): Promise<ItemResponse<Project>> {
  return api<ItemResponse<Project>>(`/api/v1/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteProject(api: ApiFn, id: string): Promise<null> {
  return api<null>(`/api/v1/projects/${id}`, { method: "DELETE" });
}
