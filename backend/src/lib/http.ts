/**
 * Contrato de respuesta de la API (ver DEVELOPMENT_PLAN.md §7.2).
 *
 *   Éxito:  { "data": ..., "meta"?: ... }
 *   Error:  { "error": { "code", "message", "details"? } }
 */

/** Cuerpo estándar de éxito. */
export interface ApiSuccess<TData, TMeta = Record<string, unknown>> {
  data: TData;
  meta?: TMeta;
}

/** Cuerpo estándar de error. */
export interface ApiErrorBody<TDetails = unknown> {
  error: {
    code: string;
    message: string;
    details?: TDetails;
  };
}

/** Metadatos de paginación para respuestas de listado. */
export interface ListMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** Construye el cuerpo de éxito, omitiendo `meta` si no se proporciona. */
export function success<TData, TMeta = Record<string, unknown>>(
  data: TData,
  meta?: TMeta,
): ApiSuccess<TData, TMeta> {
  return meta === undefined ? { data } : { data, meta };
}

/** Construye el cuerpo de error, omitiendo `details` si no se proporciona. */
export function failure(code: string, message: string, details?: unknown): ApiErrorBody {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}

/**
 * Serializa a JSON de forma tolerante a `BigInt`.
 *
 * Las claves primarias del modelo son `BIGINT` y Prisma las expone como `bigint`,
 * que `JSON.stringify` no sabe convertir. Las serializamos como cadena para no
 * perder precisión.
 */
export function serializeJson(payload: unknown): string {
  return (
    JSON.stringify(payload, (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    ) ?? ""
  );
}
