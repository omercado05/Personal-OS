import Fastify, { type FastifyInstance } from "fastify";

import { serializeJson } from "./lib/http.js";
import { buildLoggerOptions } from "./lib/logger.js";
import { registerCors } from "./middleware/cors.js";
import { registerErrorHandlers } from "./middleware/error-handler.js";
import { registerSecurityHeaders } from "./middleware/security-headers.js";
import { createRouteDependencies, registerRoutes, type RouteDependencies } from "./routes/index.js";

export interface BuildAppOptions {
  /**
   * Dependencias de las rutas. Las que no se indican toman su implementación
   * real; en los tests basta con sobreescribir las necesarias.
   */
  dependencies?: Partial<RouteDependencies>;
}

/**
 * Construye la instancia de Fastify con plugins, serialización y rutas.
 * Se separa de `server.ts` para poder instanciarla en tests sin abrir un puerto.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: buildLoggerOptions(),
    trustProxy: true,
  });

  // Serialización propia: respeta el envelope y convierte BigInt a string.
  app.setReplySerializer((payload) => serializeJson(payload));

  registerSecurityHeaders(app);
  registerCors(app);
  registerErrorHandlers(app);

  const dependencies: RouteDependencies = {
    ...createRouteDependencies(),
    ...options.dependencies,
  };
  registerRoutes(app, dependencies);

  return app;
}
