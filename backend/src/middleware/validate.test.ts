import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AppError } from "../lib/errors.js";
import { validateOrThrow } from "./validate.js";

describe("validateOrThrow", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int(),
  });

  it("devuelve el valor parseado y tipado", () => {
    const value = validateOrThrow(schema, { name: "Ana", age: "30" });
    expect(value).toEqual({ name: "Ana", age: 30 });
  });

  it("lanza un AppError 400 VALIDATION_ERROR con las incidencias en details", () => {
    try {
      validateOrThrow(schema, { name: "", age: "no-es-numero" });
      expect.unreachable("debería haber lanzado un AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.statusCode).toBe(400);
      expect(appError.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(appError.details)).toBe(true);
    }
  });
});
