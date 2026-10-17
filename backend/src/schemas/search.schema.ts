import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const searchQuerySchema = z.object({
  q: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1, "El término de búsqueda es obligatorio").max(255),
  ),
  type: z
    .preprocess(emptyToUndefined, z.enum(["all", "knowledge", "projects"]).default("all"))
    .optional()
    .transform((value) => value ?? "all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** Query de `GET /api/v1/dashboard/metrics`. */
export const metricsQuerySchema = z.object({
  // Zona horaria IANA del cliente para calcular «hoy» (tareas que vencen hoy).
  tz: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
