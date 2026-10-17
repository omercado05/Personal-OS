import { z } from "zod";

export const TASK_STATUSES = ["PENDING", "COMPLETED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const titleSchema = z.string().trim().min(1, "El título es obligatorio").max(255);
const descriptionSchema = z.string().trim().max(10_000).optional().nullable();
const prioritySchema = z.enum(TASK_PRIORITIES);
const statusSchema = z.enum(TASK_STATUSES);
const projectIdSchema = z.coerce.bigint().positive().optional().nullable();
const dueAtSchema = z.coerce.date().optional().nullable();

/** Cuerpo de `POST /api/v1/tasks`. */
export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  status: statusSchema.default("PENDING"),
  priority: prioritySchema.default("MEDIUM"),
  dueAt: dueAtSchema,
  projectId: projectIdSchema,
});

/** Cuerpo de `PUT /api/v1/tasks/:id`. */
export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema,
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  dueAt: dueAtSchema,
  projectId: projectIdSchema,
});

/** Parámetros de ruta con `:id`. */
export const taskIdParamsSchema = z.object({
  id: z.coerce.bigint().positive(),
});

/** Query de `GET /api/v1/tasks`. */
export const listTasksQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(255).optional()),
  status: z.preprocess(emptyToUndefined, statusSchema.optional()),
  priority: z.preprocess(emptyToUndefined, prioritySchema.optional()),
  projectId: z.preprocess(emptyToUndefined, z.coerce.bigint().positive().optional()),
  from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  overdue: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  dueToday: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  groupByDay: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  // Zona horaria IANA del cliente (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
  // Decide a qué día pertenece `dueAt` al agrupar y qué es «hoy». Si falta o es
  // inválida, se usa la zona local del servidor.
  tz: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
