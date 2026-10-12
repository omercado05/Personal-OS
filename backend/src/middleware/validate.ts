import type { ZodType } from "zod";

import { badRequest } from "../lib/errors.js";

/**
 * Valida `data` contra un esquema Zod y devuelve el valor tipado.
 *
 * Si la validación falla, lanza un `AppError` 400 con el código estándar
 * `VALIDATION_ERROR` y la lista de incidencias en `details`. Así, los
 * controllers pueden asumir que los datos ya son correctos.
 */
export function validateOrThrow<TOutput>(schema: ZodType<TOutput>, data: unknown): TOutput {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest("VALIDATION_ERROR", "Datos de entrada inválidos", result.error.issues);
  }
  return result.data;
}
