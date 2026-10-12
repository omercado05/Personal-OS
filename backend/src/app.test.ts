import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { parseCorsOrigins } from "./middleware/cors.js";
import { createAuthHook } from "./middleware/auth.js";

/** App con auth "no configurada" (el hook responde 503, irrelevante aquí). */
const app = buildApp({
  dependencies: {
    auth: createAuthHook({
      verifier: null,
      users: {
        async syncFromClaims() {
          throw new Error("no usado");
        },
      },
    }),
  },
});

beforeAll(() => app.ready());
afterAll(() => app.close());

describe("cabeceras de seguridad", () => {
  it("añade cabeceras de seguridad a las respuestas", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
  });
});

describe("CORS", () => {
  it("responde con Access-Control-Allow-Origin para el origen permitido", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: { origin: "http://localhost:3000" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("responde al preflight OPTIONS con métodos y cabeceras permitidos", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/me",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(String(response.headers["access-control-allow-methods"])).toContain("GET");
    expect(String(response.headers["access-control-allow-headers"]).toLowerCase()).toContain(
      "authorization",
    );
  });
});

describe("parseCorsOrigins", () => {
  it("interpreta una lista separada por comas", () => {
    expect(parseCorsOrigins("http://a.test, http://b.test")).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });

  it("devuelve true si se permite cualquier origen", () => {
    expect(parseCorsOrigins("*")).toBe(true);
  });

  it("devuelve true si la lista está vacía", () => {
    expect(parseCorsOrigins("   ")).toBe(true);
  });
});
