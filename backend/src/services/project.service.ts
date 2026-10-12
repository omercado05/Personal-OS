import { notFound } from "../lib/errors.js";
import {
  createProjectRepository,
  type ProjectRepository,
  type ProjectWithTechnologies,
} from "../repositories/project.repository.js";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "../schemas/project.schema.js";

export interface ProjectTechnologyDto {
  name: string;
}

export interface ProjectDto {
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

export interface ListProjectsResult {
  items: ProjectDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectService {
  list(userId: bigint, query: ListProjectsQuery): Promise<ListProjectsResult>;
  get(userId: bigint, id: bigint): Promise<ProjectDto>;
  create(userId: bigint, input: CreateProjectInput): Promise<ProjectDto>;
  update(userId: bigint, id: bigint, input: UpdateProjectInput): Promise<ProjectDto>;
  delete(userId: bigint, id: bigint): Promise<void>;
}

export function normalizeTechnologyNames(technologies: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of technologies) {
    const name = raw.trim().toLowerCase();
    if (name.length === 0 || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

function toDto(project: ProjectWithTechnologies): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    url: project.url,
    repositoryUrl: project.repositoryUrl,
    technologies: project.technologies.map((tech) => tech.name),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function createProjectService(
  repository: ProjectRepository = createProjectRepository(),
): ProjectService {
  return {
    async list(userId, query) {
      const { items, total } = await repository.list({
        userId,
        status: query.status,
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
      });
      return {
        items: items.map(toDto),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    },

    async get(userId, id) {
      const project = await repository.findById(userId, id);
      if (!project) {
        throw notFound("Proyecto no encontrado");
      }
      return toDto(project);
    },

    async create(userId, input) {
      const project = await repository.create(userId, {
        name: input.name,
        description: input.description ?? null,
        status: input.status,
        url: input.url ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        technologies: normalizeTechnologyNames(input.technologies),
      });
      return toDto(project);
    },

    async update(userId, id, input) {
      const project = await repository.update(userId, id, {
        name: input.name,
        description: input.description,
        status: input.status,
        url: input.url,
        repositoryUrl: input.repositoryUrl,
        technologies:
          input.technologies !== undefined
            ? normalizeTechnologyNames(input.technologies)
            : undefined,
      });
      if (!project) {
        throw notFound("Proyecto no encontrado");
      }
      return toDto(project);
    },

    async delete(userId, id) {
      const deleted = await repository.delete(userId, id);
      if (!deleted) {
        throw notFound("Proyecto no encontrado");
      }
    },
  };
}
