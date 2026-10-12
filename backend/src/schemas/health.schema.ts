import { z } from "zod";

/**
 * Query de `GET /api/v1/health/ready`.
 * `timeoutMs` acota cuánto esperamos a que la base de datos responda.
 */
export const readinessQuerySchema = z.object({
  timeoutMs: z.coerce.number().int().min(100).max(10_000).default(2_000),
});

export type ReadinessQuery = z.infer<typeof readinessQuerySchema>;
