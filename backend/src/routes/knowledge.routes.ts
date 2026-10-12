import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createKnowledgeController } from "../controllers/knowledge.controller.js";
import type { KnowledgeService } from "../services/knowledge.service.js";

/**
 * Rutas de conocimiento y tags. Todas quedan detrás del hook de autenticación:
 * cada recurso se filtra por el `userId` del token verificado.
 */
export function knowledgeRoutes(deps: { auth: preHandlerHookHandler; service: KnowledgeService }) {
  const controller = createKnowledgeController(deps.service);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/knowledge", { preHandler: deps.auth }, controller.list);
    app.post("/knowledge", { preHandler: deps.auth }, controller.create);
    app.get("/knowledge/:id", { preHandler: deps.auth }, controller.get);
    app.put("/knowledge/:id", { preHandler: deps.auth }, controller.update);
    app.delete("/knowledge/:id", { preHandler: deps.auth }, controller.remove);

    app.get("/tags", { preHandler: deps.auth }, controller.listTags);
  };
}
