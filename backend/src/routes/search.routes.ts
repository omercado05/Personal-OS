import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createSearchController } from "../controllers/search.controller.js";
import type { SearchService } from "../services/search.service.js";

export function searchRoutes(deps: { auth: preHandlerHookHandler; service: SearchService }) {
  const controller = createSearchController(deps.service);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/search", { preHandler: deps.auth }, controller.search);
    app.get("/dashboard", { preHandler: deps.auth }, controller.dashboard);
  };
}
