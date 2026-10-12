import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { resolveAuthConfig } from "../auth/config.js";
import { createRemoteTokenVerifier } from "../auth/jwt-verifier.js";
import { createAuthHook } from "../middleware/auth.js";
import { createHealthService, type HealthService } from "../services/health.service.js";
import { createUserService } from "../services/user.service.js";
import { healthRoutes } from "./health.routes.js";
import { meRoutes } from "./me.routes.js";

/** Prefijo común de todas las rutas de la API. */
export const API_PREFIX = "/api/v1";

/** Dependencias que necesitan las rutas (se inyectan para facilitar los tests). */
export interface RouteDependencies {
  health: HealthService;
  /** Hook `preHandler` que exige un token válido y rellena `request.user`. */
  auth: preHandlerHookHandler;
}

/** Construye las dependencias por defecto (implementaciones reales). */
export function createRouteDependencies(): RouteDependencies {
  const authConfig = resolveAuthConfig();
  const users = createUserService();

  return {
    health: createHealthService(),
    auth: createAuthHook({
      verifier: authConfig ? createRemoteTokenVerifier(authConfig) : null,
      users,
    }),
  };
}

/**
 * Registro central de rutas. Cada módulo (knowledge, projects, tags, ...) se
 * añadirá aquí en su fase correspondiente.
 */
export function registerRoutes(app: FastifyInstance, deps: RouteDependencies): void {
  app.register(healthRoutes(deps.health), { prefix: API_PREFIX });
  app.register(meRoutes(deps.auth), { prefix: API_PREFIX });
}
