import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createProjectController } from "../controllers/project.controller.js";
import type { ProjectService } from "../services/project.service.js";

/**
 * Rutas de proyectos. Todas quedan detrás del hook de autenticación.
 */
export function projectRoutes(deps: { auth: preHandlerHookHandler; service: ProjectService }) {
  const controller = createProjectController(deps.service);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/projects", { preHandler: deps.auth }, controller.list);
    app.post("/projects", { preHandler: deps.auth }, controller.create);
    app.get("/projects/:id", { preHandler: deps.auth }, controller.get);
    app.put("/projects/:id", { preHandler: deps.auth }, controller.update);
    app.delete("/projects/:id", { preHandler: deps.auth }, controller.remove);
  };
}
