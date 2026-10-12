import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { notFound, unauthorized } from "../lib/errors.js";
import { createAuthHook } from "../middleware/auth.js";
import type { ProjectDto, ProjectService } from "../services/project.service.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

const project: ProjectDto = {
  id: 1n,
  name: "Personal OS",
  description: "Mi sistema personal",
  status: "in_progress",
  url: null,
  repositoryUrl: "https://github.com/user/personal-os",
  technologies: ["typescript", "nextjs"],
  createdAt: new Date("2026-10-12T00:00:00.000Z"),
  updatedAt: new Date("2026-10-12T00:00:00.000Z"),
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

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") {
      throw unauthorized("Token inválido o expirado");
    }
    return { sub: "user-123", email: undefined, name: undefined };
  },
};

function createFakeService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    async list(_userId, query) {
      return { items: [project], total: 1, page: query.page, pageSize: query.pageSize };
    },
    async get(_userId, id) {
      if (id !== project.id) {
        throw notFound("Proyecto no encontrado");
      }
      return project;
    },
    async create(_userId, input) {
      return {
        ...project,
        name: input.name,
        status: input.status,
        technologies: input.technologies,
      };
    },
    async update(_userId, id, input) {
      if (id !== project.id) {
        throw notFound("Proyecto no encontrado");
      }
      return { ...project, ...input, technologies: input.technologies ?? project.technologies };
    },
    async delete(_userId, id) {
      if (id !== project.id) {
        throw notFound("Proyecto no encontrado");
      }
    },
    ...overrides,
  };
}

function buildAppWith(service: ProjectService): FastifyInstance {
  return buildApp({
    dependencies: {
      auth: createAuthHook({ verifier, users }),
      projects: service,
    },
  });
}

const authHeader = { authorization: "Bearer valid-token" };

describe("rutas de proyectos (protegidas)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("responde 401 sin token", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/projects" });
    expect(response.statusCode).toBe(401);
  });

  it("GET /projects devuelve el envelope con paginación", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/projects?page=1&pageSize=10",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "1",
      name: "Personal OS",
      technologies: ["typescript", "nextjs"],
    });
    expect(body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("POST /projects crea con 201", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: authHeader,
      payload: { name: "Nuevo", status: "idea", technologies: ["go"] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({ name: "Nuevo", status: "idea" });
  });

  it("POST /projects rechaza estado inválido", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: authHeader,
      payload: { name: "X", status: "invalid" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("GET /projects/:id devuelve 404 si no existe", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/projects/999",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(404);
  });

  it("PUT /projects/:id actualiza y devuelve 200", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/projects/1",
      headers: authHeader,
      payload: { status: "completed" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe("completed");
  });

  it("DELETE /projects/:id devuelve 204", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/projects/1",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });
});
