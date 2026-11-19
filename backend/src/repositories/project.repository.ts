import type { Prisma, Project, ProjectTechnology } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { everyTermMatches, searchTerms } from "../lib/text-search.js";

export type ProjectWithTechnologies = Project & {
  technologies: ProjectTechnology[];
};

export interface ListProjectsParams {
  userId: bigint;
  status?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface CreateProjectData {
  name: string;
  description: string | null;
  status: string;
  url: string | null;
  repositoryUrl: string | null;
  technologies: string[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: string;
  url?: string | null;
  repositoryUrl?: string | null;
  technologies?: string[];
}

export interface ProjectRepository {
  list(params: ListProjectsParams): Promise<{ items: ProjectWithTechnologies[]; total: number }>;
  findById(userId: bigint, id: bigint): Promise<ProjectWithTechnologies | null>;
  create(userId: bigint, data: CreateProjectData): Promise<ProjectWithTechnologies>;
  update(
    userId: bigint,
    id: bigint,
    data: UpdateProjectData,
  ): Promise<ProjectWithTechnologies | null>;
  delete(userId: bigint, id: bigint): Promise<boolean>;
}

const technologiesInclude = { technologies: true } satisfies Prisma.ProjectInclude;

type RawProject = Project & { technologies: ProjectTechnology[] };

function toProject(raw: RawProject): ProjectWithTechnologies {
  return {
    ...raw,
    technologies: raw.technologies,
  };
}

export function createProjectRepository(): ProjectRepository {
  return {
    async list(params) {
      const where = {
        userId: params.userId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.q
          ? everyTermMatches(searchTerms(params.q), (term) => [
              { name: { contains: term } },
              { description: { contains: term } },
              // Las tecnologías se guardan en minúsculas.
              { technologies: { some: { name: { contains: term.toLowerCase() } } } },
            ])
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: technologiesInclude,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.project.count({ where }),
      ]);

      return { items: rows.map(toProject), total };
    },

    async findById(userId, id) {
      const row = await prisma.project.findFirst({
        where: { id, userId },
        include: technologiesInclude,
      });
      return row ? toProject(row) : null;
    },

    async create(userId, data) {
      const created = await prisma.project.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          status: data.status,
          url: data.url,
          repositoryUrl: data.repositoryUrl,
          technologies: {
            createMany: {
              data: data.technologies.map((name) => ({ name })),
              skipDuplicates: true,
            },
          },
        },
        include: technologiesInclude,
      });
      return toProject(created);
    },

    async update(userId, id, data) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.project.findFirst({ where: { id, userId } });
        if (!existing) {
          return null;
        }

        await tx.project.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.url !== undefined ? { url: data.url } : {}),
            ...(data.repositoryUrl !== undefined ? { repositoryUrl: data.repositoryUrl } : {}),
          },
        });

        if (data.technologies !== undefined) {
          await tx.projectTechnology.deleteMany({ where: { projectId: id } });
          if (data.technologies.length > 0) {
            await tx.projectTechnology.createMany({
              data: data.technologies.map((name) => ({ projectId: id, name })),
              skipDuplicates: true,
            });
          }
        }

        const updated = await tx.project.findUnique({
          where: { id },
          include: technologiesInclude,
        });
        return updated ? toProject(updated) : null;
      });
    },

    async delete(userId, id) {
      const result = await prisma.project.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },
  };
}
