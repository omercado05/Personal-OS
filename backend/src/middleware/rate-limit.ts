import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { AppError } from "../lib/errors.js";

/**
 * Presupuestos por minuto e IP (Fase 9).
 *
 * La API es de un solo usuario, pero desde la Fase 9 es accesible desde fuera
 * de casa: un cliente disparado podría agotar el pool de conexiones a MySQL con
 * consultas `LIKE` (la búsqueda es el punto más caro). Los valores son holgados
 * para el uso normal: navegar a mano no se acerca a 300 peticiones por minuto.
 */
export const RATE_LIMITS = {
  /** Lecturas: todo lo que no encaja en las categorías siguientes. */
  read: 300,
  /** Escrituras: crear, actualizar y eliminar. */
  write: 60,
  /** Búsqueda global: consulta `LIKE` sobre MySQL. */
  search: 60,
} as const;

export type RateLimits = Record<keyof typeof RATE_LIMITS, number>;

/** Combina los presupuestos por defecto con los sobreescritos (útil en tests). */
export function resolveRateLimits(overrides: Partial<RateLimits> = {}): RateLimits {
  return { ...RATE_LIMITS, ...overrides };
}

/** Presupuesto aplicable a una petición según su método. */
function budgetFor(request: FastifyRequest, limits: RateLimits): number {
  return request.method === "GET" ? limits.read : limits.write;
}

/**
 * Limita la tasa de peticiones con ventana fija de un minuto por IP.
 *
 * Se registra antes que las rutas, así que su hook `onRequest` se ejecuta
 * primero. Las cabeceras `x-ratelimit-*` y `retry-after` las añade el plugin; al
 * superar el límite el plugin *lanza* lo que devuelve `errorResponseBuilder`, de
 * modo que devolvemos un `AppError` para que el handler central lo traduzca al
 * envelope estándar de la API (§7.2).
 *
 * La búsqueda define su propio presupuesto en su ruta (`search.routes.ts`).
 */
export function registerRateLimit(app: FastifyInstance, limits: RateLimits): void {
  void app.register(rateLimit, {
    global: true,
    // Las escrituras consumen un presupuesto propio, más ajustado.
    max: (request) => budgetFor(request, limits),
    timeWindow: "1 minute",
    errorResponseBuilder: (_request, context) =>
      new AppError(
        429,
        "RATE_LIMIT_EXCEEDED",
        `Demasiadas peticiones. Límite alcanzado (${context.max}/min); reintenta en ${context.after}.`,
        { max: context.max, retryAfter: context.after },
      ),
  });
}
