import { describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { createAuthHook } from "./auth.js";
import type { RateLimits } from "./rate-limit.js";

/**
 * Crea una app aislada con auth sin configurar (el hook responde 503) y
 * presupuestos bajos a propósito: así el límite se alcanza en dos o tres
 * peticiones en lugar de disparar cientos de `inject`.
 *
 * Cada caso usa su propia instancia porque el almacén del limitador es en
 * memoria y la clave es la IP: compartir la app agotaría el presupuesto entre
 * tests.
 */
async function makeApp(rateLimits: Partial<RateLimits>) {
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
    rateLimits,
  });
  await app.ready();
  return app;
}

const limits: RateLimits = { read: 3, write: 1, search: 2 };

describe("rate limiting", () => {
  it("publica el presupuesto restante en las cabeceras", async () => {
    const app = await makeApp(limits);
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/health" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["x-ratelimit-limit"]).toBe("3");
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("responde 429 con el envelope de error al agotar el presupuesto", async () => {
    const app = await makeApp(limits);
    try {
      const url = "/api/v1/health";
      for (let i = 0; i < 3; i += 1) {
        const ok = await app.inject({ method: "GET", url });
        expect(ok.statusCode).toBe(200);
      }

      const limited = await app.inject({ method: "GET", url });

      expect(limited.statusCode).toBe(429);
      expect(limited.headers["retry-after"]).toBeDefined();
      expect(limited.json()).toMatchObject({
        error: { code: "RATE_LIMIT_EXCEEDED" },
      });
      expect(limited.json().error.message).toContain("reintenta");
    } finally {
      await app.close();
    }
  });

  it("aplica un presupuesto menor a las escrituras", async () => {
    const app = await makeApp(limits);
    try {
      const url = "/api/v1/knowledge";

      const first = await app.inject({ method: "POST", url, payload: {} });
      // Sin auth configurada el hook responde 503; lo que importa es que sí
      // consume presupuesto de escritura (1/min) y no el de lectura (3/min).
      expect(first.statusCode).toBe(503);
      expect(first.headers["x-ratelimit-limit"]).toBe("1");

      const second = await app.inject({ method: "POST", url, payload: {} });
      expect(second.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("las lecturas no gastan el presupuesto de escritura", async () => {
    const app = await makeApp(limits);
    try {
      // Navegar (lecturas) dentro de su propio presupuesto…
      for (let i = 0; i < 3; i += 1) {
        const read = await app.inject({ method: "GET", url: "/api/v1/health" });
        expect(read.statusCode).toBe(200);
      }

      // …no impide la primera escritura del minuto (503: auth sin configurar).
      const write = await app.inject({ method: "POST", url: "/api/v1/knowledge", payload: {} });
      expect(write.statusCode).toBe(503);
    } finally {
      await app.close();
    }
  });

  it("las verificaciones previas CORS (OPTIONS) no gastan el presupuesto de escritura", async () => {
    const app = await makeApp(limits);
    try {
      const url = "/api/v1/knowledge";
      await app.inject({
        method: "OPTIONS",
        url,
        headers: { origin: "http://localhost:3000", "access-control-request-method": "POST" },
      });

      const write = await app.inject({ method: "POST", url, payload: {} });
      expect(write.statusCode).toBe(503);
    } finally {
      await app.close();
    }
  });

  it("las escrituras no gastan el presupuesto de lectura", async () => {
    const app = await makeApp(limits);
    try {
      await app.inject({ method: "POST", url: "/api/v1/knowledge", payload: {} });

      const read = await app.inject({ method: "GET", url: "/api/v1/health" });
      expect(read.statusCode).toBe(200);
      expect(read.headers["x-ratelimit-remaining"]).toBe("2");
    } finally {
      await app.close();
    }
  });

  it("da a la búsqueda un presupuesto propio", async () => {
    const app = await makeApp(limits);
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/search?q=x" });

      expect(response.headers["x-ratelimit-limit"]).toBe("2");
    } finally {
      await app.close();
    }
  });
});
