import Fastify, { type FastifyInstance } from "fastify";

import { serializeJson } from "./lib/http.js";
import { buildLoggerOptions } from "./lib/logger.js";
import { registerCors } from "./middleware/cors.js";
import { registerErrorHandlers } from "./middleware/error-handler.js";
import { registerRateLimit, resolveRateLimits, type RateLimits } from "./middleware/rate-limit.js";
import { registerSecurityHeaders } from "./middleware/security-headers.js";
import { createRouteDependencies, registerRoutes, type RouteDependencies } from "./routes/index.js";

export interface BuildAppOptions {
  /**
   * Dependencias de las rutas. Las que no se indican toman su implementación
   * real; en los tests basta con sobreescribir las necesarias.
   */
  dependencies?: Partial<RouteDependencies>;
  /** Presupuestos de rate limiting; solo tienen sentido sobreescribirlos en tests. */
  rateLimits?: Partial<RateLimits>;
}

/**
 * Construye la instancia de Fastify con plugins, serialización y rutas.
 * Se separa de `server.ts` para poder instanciarla en tests sin abrir un puerto.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: buildLoggerOptions(),
    // No hay proxy inverso hasta la Fase 10 (Traefik/Dockploy). Confiar en
    // `X-Forwarded-For` a ciegas dejaría a cualquier cliente rotar su IP lógica
    // y saltarse el rate limiting; detras de un proxy habrá que reactivarlo
    // (limitado a la red del propio proxy).
    trustProxy: false,
  });

  // Serialización propia: respeta el envelope y convierte BigInt a string.
  app.setReplySerializer((payload) => serializeJson(payload));

  registerSecurityHeaders(app);
  registerCors(app);
  registerErrorHandlers(app);

  // Los límites resueltos se comparten con las rutas que definen presupuestos
  // propios (la búsqueda).
  const rateLimits = resolveRateLimits(options.rateLimits);
  registerRateLimit(app, rateLimits);

  const dependencies: RouteDependencies = {
    ...createRouteDependencies(),
    ...options.dependencies,
  };
  registerRoutes(app, dependencies, rateLimits);

  return app;
}
