import Fastify, { type FastifyInstance } from "fastify";

import { buildLoggerOptions } from "./lib/logger.js";
import { registerRoutes } from "./routes/index.js";

/**
 * Construye la instancia de Fastify con plugins y rutas.
 * Se separa de `server.ts` para poder instanciarla en tests sin abrir un puerto.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: buildLoggerOptions(),
    trustProxy: true,
  });

  void app.register(registerRoutes, { prefix: "/api/v1" });

  return app;
}
