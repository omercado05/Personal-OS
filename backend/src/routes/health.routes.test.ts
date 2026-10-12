import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { createHealthService } from "../services/health.service.js";

/** App con un "ping" a base de datos simulado, para no depender de MySQL. */
function buildTestApp(pinger: () => Promise<boolean>): FastifyInstance {
  return buildApp({ dependencies: { health: createHealthService(pinger) } });
}

describe("GET /api/v1/health (liveness)", () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildTestApp(async () => true);
  });

  afterAll(async () => {
    await app.close();
  });

  it("responde 200 con el envelope { data } y content-type JSON", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toMatchObject({
      data: { status: "ok", service: "personal-os-api" },
    });
    expect(response.json()).not.toHaveProperty("error");
  });
});

describe("GET /api/v1/health/ready (readiness)", () => {
  it("responde 200 cuando la base de datos responde", async () => {
    const app = buildTestApp(async () => true);
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/health/ready" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ data: { status: "ok", database: "up" } });
    } finally {
      await app.close();
    }
  });

  it("responde 503 con el formato de error estándar cuando la base de datos no responde", async () => {
    const app = buildTestApp(async () => false);
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/health/ready" });

      expect(response.statusCode).toBe(503);
      expect(response.json().error).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    } finally {
      await app.close();
    }
  });

  it("responde 400 VALIDATION_ERROR si timeoutMs está fuera de rango", async () => {
    const app = buildTestApp(async () => true);
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health/ready?timeoutMs=5",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatchObject({ code: "VALIDATION_ERROR" });
    } finally {
      await app.close();
    }
  });
});

describe("manejo central de errores", () => {
  it("responde 404 con el formato estándar en rutas desconocidas", async () => {
    const app = buildTestApp(async () => true);
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/no-existe" });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toMatchObject({ code: "ROUTE_NOT_FOUND" });
    } finally {
      await app.close();
    }
  });
});
