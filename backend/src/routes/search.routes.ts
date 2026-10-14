import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createSearchController } from "../controllers/search.controller.js";
import type { RateLimits } from "../middleware/rate-limit.js";
import type { SearchService } from "../services/search.service.js";

export function searchRoutes(deps: {
  auth: preHandlerHookHandler;
  service: SearchService;
  rateLimits: RateLimits;
}) {
  const controller = createSearchController(deps.service);

  return async function register(app: FastifyInstance): Promise<void> {
    // La búsqueda es la única consulta `LIKE` de la API: presupuesto propio.
    app.get(
      "/search",
      {
        preHandler: deps.auth,
        config: { rateLimit: { max: deps.rateLimits.search, timeWindow: "1 minute" } },
      },
      controller.search,
    );
    app.get("/dashboard", { preHandler: deps.auth }, controller.dashboard);
  };
}
