import { z } from "zod";

/**
 * Estados permitidos para un proyecto.
 */
export const PROJECT_STATUSES = [
  "idea",
  "planning",
  "in_progress",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const technologyNameSchema = z
  .string()
  .trim()
  .min(1, "La tecnología no puede estar vacía")
  .max(100, "La tecnología es demasiado larga");

/**
 * Cuerpo de `POST /api/v1/projects`.
 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(255),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: projectStatusSchema.default("idea"),
  url: z.string().trim().url("La URL no es válida").max(2048).optional().nullable(),
  repositoryUrl: z.string().trim().url("La URL no es válida").max(2048).optional().nullable(),
  technologies: z.array(technologyNameSchema).max(50, "Demasiadas tecnologías").default([]),
});

/**
 * Cuerpo de `PUT /api/v1/projects/:id`.
 */
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(255).optional(),
  description: z.string().trim().max(10_000).optional().nullable(),
  status: projectStatusSchema.optional(),
  url: z.string().trim().url("La URL no es válida").max(2048).optional().nullable(),
  repositoryUrl: z.string().trim().url("La URL no es válida").max(2048).optional().nullable(),
  technologies: z.array(technologyNameSchema).max(50, "Demasiadas tecnologías").optional(),
});

/**
 * Parámetros de ruta con `:id`.
 */
export const projectIdParamsSchema = z.object({
  id: z.coerce.bigint().positive(),
});

/**
 * Query de `GET /api/v1/projects` (filtros + paginación).
 */
export const listProjectsQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, projectStatusSchema.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(255).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
