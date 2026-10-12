import { describe, expect, it } from "vitest";

import { failure, serializeJson, success } from "./http.js";

describe("envelope de respuesta", () => {
  it("success sin meta", () => {
    expect(success({ a: 1 })).toEqual({ data: { a: 1 } });
  });

  it("success con meta", () => {
    expect(success({ a: 1 }, { page: 1 })).toEqual({ data: { a: 1 }, meta: { page: 1 } });
  });

  it("failure sin details", () => {
    expect(failure("SOME_CODE", "mensaje")).toEqual({
      error: { code: "SOME_CODE", message: "mensaje" },
    });
  });

  it("failure con details", () => {
    expect(failure("SOME_CODE", "mensaje", ["detalle"])).toEqual({
      error: { code: "SOME_CODE", message: "mensaje", details: ["detalle"] },
    });
  });
});

describe("serializeJson", () => {
  it("convierte BigInt a string para no perder precisión", () => {
    expect(serializeJson({ id: 10n })).toBe('{"id":"10"}');
  });

  it("serializa objetos anidados", () => {
    expect(serializeJson(success({ id: 1n }))).toBe('{"data":{"id":"1"}}');
  });
});
