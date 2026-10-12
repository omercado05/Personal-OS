import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { notFound, unauthorized } from "../lib/errors.js";
import { createAuthHook } from "../middleware/auth.js";
import type { KnowledgeEntryDto, KnowledgeService } from "../services/knowledge.service.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

const entry: KnowledgeEntryDto = {
  id: 1n,
  title: "Nota",
  content: "contenido",
  category: "Programming",
  tags: ["typescript"],
  createdAt: new Date("2026-10-11T10:00:00.000Z"),
  updatedAt: new Date("2026-10-11T10:00:00.000Z"),
};

const users: UserService = {
  async syncFromClaims(claims) {
    const user: AuthenticatedUser = {
      id: 1n,
      stackUserId: claims.sub,
      email: claims.email ?? null,
      displayName: claims.name ?? null,
    };
    return user;
  },
};

/** Verificador que acepta solo el token literal "valid-token". */
const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") {
      throw unauthorized("Token inválido o expirado");
    }
    return { sub: "user-123", email: undefined, name: undefined };
  },
};

/** Servicio de conocimiento simulado (evita depender de MySQL). */
function createFakeService(overrides: Partial<KnowledgeService> = {}): KnowledgeService {
  return {
    async list(_userId, query) {
      return { items: [entry], total: 1, page: query.page, pageSize: query.pageSize };
    },
    async get(_userId, id) {
      if (id !== entry.id) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
      return entry;
    },
    async create(_userId, input) {
      return {
        ...entry,
        title: input.title,
        content: input.content,
        category: input.category,
        tags: input.tags,
      };
    },
    async update(_userId, id, input) {
      if (id !== entry.id) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
      return { ...entry, ...input, tags: input.tags ?? entry.tags };
    },
    async delete(_userId, id) {
      if (id !== entry.id) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
    },
    async listTags() {
      return [{ id: 5n, name: "typescript" }];
    },
    ...overrides,
  };
}

function buildAppWith(service: KnowledgeService): FastifyInstance {
  return buildApp({
    dependencies: {
      auth: createAuthHook({ verifier, users }),
      knowledge: service,
    },
  });
}

const authHeader = { authorization: "Bearer valid-token" };

describe("rutas de conocimiento y tags (protegidas)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("responde 401 sin cabecera Authorization", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/knowledge" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("GET /knowledge devuelve el envelope { data, meta } con paginación", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/knowledge?page=1&pageSize=10",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: "1", title: "Nota", tags: ["typescript"] });
    expect(body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("GET /knowledge rechaza pageSize fuera del máximo", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/knowledge?pageSize=1000",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("POST /knowledge crea con 201", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/knowledge",
      headers: authHeader,
      payload: { title: "Nueva", content: "x", category: "Linux", tags: ["bash"] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({ title: "Nueva", category: "Linux" });
  });

  it("POST /knowledge rechaza una categoría inválida", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/knowledge",
      headers: authHeader,
      payload: { title: "X", category: "NoExiste" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("POST /knowledge rechaza un título vacío", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/knowledge",
      headers: authHeader,
      payload: { title: "   ", category: "Other" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /knowledge/:id devuelve 404 si no existe", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/knowledge/999",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("GET /knowledge/:id rechaza un id no numérico", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/knowledge/abc",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(400);
  });

  it("PUT /knowledge/:id actualiza y devuelve 200", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/knowledge/1",
      headers: authHeader,
      payload: { title: "Editada" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.title).toBe("Editada");
  });

  it("DELETE /knowledge/:id devuelve 204 sin cuerpo", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/knowledge/1",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });

  it("GET /tags devuelve los tags del usuario", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/tags", headers: authHeader });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([{ id: "5", name: "typescript" }]);
  });
});
