import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { AppError } from "../lib/errors.js";
import { failure } from "../lib/http.js";

/**
 * Manejo central de errores: garantiza que *toda* respuesta de error use el
 * formato estándar `{ error: { code, message, details? } }`.
 *
 * Orden de resolución:
 *   1. `AppError`  → error de negocio controlado (status y código propios).
 *   2. `ZodError`  → validación con Zod (400 - VALIDATION_ERROR).
 *   3. `error.validation` → validación nativa de Fastify (400 - VALIDATION_ERROR).
 *   4. Otros 4xx   → se respetan (código genérico "ERROR").
 *   5. Desconocidos → 500 INTERNAL_ERROR, sin filtrar detalles internos.
 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    return reply
      .status(404)
      .send(failure("ROUTE_NOT_FOUND", `Ruta no encontrada: ${request.method} ${request.url}`));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error }, "Error controlado de la aplicación");
      return reply.status(error.statusCode).send(failure(error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(failure("VALIDATION_ERROR", "Datos de entrada inválidos", error.issues));
    }

    if (error.validation) {
      return reply
        .status(400)
        .send(failure("VALIDATION_ERROR", "Datos de entrada inválidos", error.validation));
    }

    const statusCode =
      typeof error.statusCode === "number" && error.statusCode >= 400 ? error.statusCode : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, "Error no controlado");
      return reply
        .status(500)
        .send(failure("INTERNAL_ERROR", "Se produjo un error interno en el servidor"));
    }

    return reply.status(statusCode).send(failure("ERROR", error.message));
  });
}
