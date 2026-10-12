import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { resolveAuthConfig } from "../auth/config.js";
import { createRemoteTokenVerifier } from "../auth/jwt-verifier.js";
import { createAuthHook } from "../middleware/auth.js";
import { createHealthService, type HealthService } from "../services/health.service.js";
import { createKnowledgeService, type KnowledgeService } from "../services/knowledge.service.js";
import { createProjectService, type ProjectService } from "../services/project.service.js";
import { createSearchService, type SearchService } from "../services/search.service.js";
import { createUserService } from "../services/user.service.js";
import { healthRoutes } from "./health.routes.js";
import { knowledgeRoutes } from "./knowledge.routes.js";
import { meRoutes } from "./me.routes.js";
import { projectRoutes } from "./project.routes.js";
import { searchRoutes } from "./search.routes.js";

/** Prefijo común de todas las rutas de la API. */
export const API_PREFIX = "/api/v1";

/** Dependencias que necesitan las rutas (se inyectan para facilitar los tests). */
export interface RouteDependencies {
  health: HealthService;
  /** Hook `preHandler` que exige un token válido y rellena `request.user`. */
  auth: preHandlerHookHandler;
  /** Lógica de conocimiento y tags. */
  knowledge: KnowledgeService;
  /** Lógica de proyectos. */
  projects: ProjectService;
  /** Búsqueda y dashboard. */
  search: SearchService;
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
    knowledge: createKnowledgeService(),
    projects: createProjectService(),
    search: createSearchService(),
  };
}

/**
 * Registro central de rutas. Cada módulo (knowledge, projects, tags, ...) se
 * añade aquí en su fase correspondiente.
 */
export function registerRoutes(app: FastifyInstance, deps: RouteDependencies): void {
  app.register(healthRoutes(deps.health), { prefix: API_PREFIX });
  app.register(meRoutes(deps.auth), { prefix: API_PREFIX });
  app.register(knowledgeRoutes({ auth: deps.auth, service: deps.knowledge }), {
    prefix: API_PREFIX,
  });
  app.register(projectRoutes({ auth: deps.auth, service: deps.projects }), {
    prefix: API_PREFIX,
  });
  app.register(searchRoutes({ auth: deps.auth, service: deps.search }), {
    prefix: API_PREFIX,
  });
}
