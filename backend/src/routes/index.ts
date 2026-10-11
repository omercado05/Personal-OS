import type { FastifyInstance } from "fastify";

import { healthRoutes } from "./health.js";

/**
 * Registro central de rutas versionadas de la API (`/api/v1`).
 * Cada módulo (knowledge, projects, ...) se añadirá aquí en sus fases.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
}
