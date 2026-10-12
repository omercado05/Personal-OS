/**
 * Error de aplicación con un código estable, un status HTTP y detalles opcionales.
 *
 * El manejador central de errores (ver `middleware/error-handler.ts`) traduce
 * cualquier `AppError` al formato de error estándar de la API. La lógica de
 * negocio debe lanzar estos errores en lugar de construir respuestas HTTP.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: unknown): AppError {
  return new AppError(400, code, message, details);
}

export function unauthorized(message = "No autenticado", details?: unknown): AppError {
  return new AppError(401, "UNAUTHORIZED", message, details);
}

export function forbidden(message = "Acceso denegado", details?: unknown): AppError {
  return new AppError(403, "FORBIDDEN", message, details);
}

export function notFound(message = "Recurso no encontrado", details?: unknown): AppError {
  return new AppError(404, "NOT_FOUND", message, details);
}

export function conflict(code: string, message: string, details?: unknown): AppError {
  return new AppError(409, code, message, details);
}

export function serviceUnavailable(message: string, details?: unknown): AppError {
  return new AppError(503, "SERVICE_UNAVAILABLE", message, details);
}
