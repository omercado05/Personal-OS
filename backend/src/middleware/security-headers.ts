import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";

/**
 * Cabeceras de seguridad básicas para una API JSON.
 *
 * No usamos `helmet` (evitamos una dependencia extra): la API solo devuelve
 * JSON, así que basta con un conjunto pequeño y explícito de cabeceras.
 */
export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-DNS-Prefetch-Control", "off");
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

    // HSTS solo tiene sentido sobre HTTPS (producción, detrás de Traefik).
    if (env.nodeEnv === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    return payload;
  });
}
