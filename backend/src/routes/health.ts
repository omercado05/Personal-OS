import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

/**
 * `GET /api/v1/health`
 *
 * Comprobación de vida del proceso. No toca la base de datos ni dependencias
 * externas (esas comprobaciones llegarán con los módulos correspondientes).
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "personal-os-api",
      version: env.appVersion,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
