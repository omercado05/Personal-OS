import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createMeController } from "../controllers/me.controller.js";

/**
 * Rutas del usuario autenticado. `GET /me` queda detrás del hook de
 * autenticación (token válido obligatorio).
 */
export function meRoutes(auth: preHandlerHookHandler) {
  const controller = createMeController();

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/me", { preHandler: auth }, controller.get);
  };
}
