import { z } from "zod";

/**
 * Categorías permitidas para una entrada de conocimiento. Lista fija en código
 * (ver DEVELOPMENT_PLAN.md §6.1): evita una tabla extra en el MVP y es migrable
 * a tabla si en el futuro se necesita gestionarlas desde la UI.
 */
export const KNOWLEDGE_CATEGORIES = [
  "Programming",
  "Linux",
  "Networking",
  "Databases",
  "University",
  "Coffee",
  "Ideas",
  "Projects",
  "Other",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const knowledgeCategorySchema = z.enum(KNOWLEDGE_CATEGORIES);

/** Trata la cadena vacía como valor ausente (`?q=` equivale a no enviar `q`). */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const tagNameSchema = z
  .string()
  .trim()
  .min(1, "El tag no puede estar vacío")
  .max(100, "El tag es demasiado largo");

/** Cuerpo de `POST /api/v1/knowledge`. */
export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(255),
  content: z.string().max(100_000).default(""),
  category: knowledgeCategorySchema,
  tags: z.array(tagNameSchema).max(20, "Demasiados tags").default([]),
});

/**
 * Cuerpo de `PUT /api/v1/knowledge/:id`. Todos los campos son opcionales: los
 * omitidos se dejan sin cambios. Si se envía `tags`, reemplaza la lista completa.
 */
export const updateKnowledgeSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(255).optional(),
  content: z.string().max(100_000).optional(),
  category: knowledgeCategorySchema.optional(),
  tags: z.array(tagNameSchema).max(20, "Demasiados tags").optional(),
});

/** Parámetros de ruta con `:id` (BIGINT). */
export const knowledgeIdParamsSchema = z.object({
  id: z.coerce.bigint().positive(),
});

/** Query de `GET /api/v1/knowledge` (filtros + paginación). */
export const listKnowledgeQuerySchema = z.object({
  category: z.preprocess(emptyToUndefined, knowledgeCategorySchema.optional()),
  tag: z.preprocess(emptyToUndefined, tagNameSchema.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(255).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>;
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>;
export type ListKnowledgeQuery = z.infer<typeof listKnowledgeQuerySchema>;
