import type { FastifyPluginAsync } from "fastify";

import { createHealthController } from "../controllers/health.controller.js";
import type { HealthService } from "../services/health.service.js";

/**
 * Rutas de salud:
 *   - `GET /health`        → liveness (proceso vivo).
 *   - `GET /health/ready`  → readiness (base de datos accesible).
 */
export function healthRoutes(service: HealthService): FastifyPluginAsync {
  const controller = createHealthController(service);

  return async (app) => {
    app.get("/health", controller.liveness);
    app.get("/health/ready", controller.readiness);
  };
}
