import type { FastifyServerOptions } from "fastify";

import { env } from "../config/env.js";

/**
 * Opciones de logging para Fastify (que usa pino por debajo).
 *
 * - Desarrollo: salida legible con `pino-pretty`.
 * - Test / producción: JSON estructurado (pino crudo).
 */
export function buildLoggerOptions(): FastifyServerOptions["logger"] {
  if (env.nodeEnv === "development") {
    return {
      level: env.logLevel,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    };
  }

  return { level: env.logLevel };
}
