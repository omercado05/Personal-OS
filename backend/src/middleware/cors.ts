import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";

/** Métodos HTTP aceptados por la API. */
const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

/** Cabeceras que el navegador puede enviar. */
const ALLOWED_HEADERS = ["Content-Type", "Authorization"];

/**
 * Interpreta `CORS_ORIGIN`. Admite una lista separada por comas; `*` permite
 * cualquier origen (útil solo en desarrollo).
 */
export function parseCorsOrigins(value: string): string[] | true {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.includes("*")) {
    return true;
  }
  return origins.length > 0 ? origins : true;
}

/**
 * Configura CORS de forma explícita (ver `DEVELOPMENT_PLAN.md` §8.2/§12: se usan
 * *Bearer tokens*, no cookies cross-site, así que no se permiten credenciales).
 */
export function registerCors(app: FastifyInstance): void {
  app.register(cors, {
    origin: parseCorsOrigins(env.corsOrigin),
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    credentials: false,
    maxAge: 86_400,
  });
}
