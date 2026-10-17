import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { notFound, unauthorized } from "../lib/errors.js";
import { createAuthHook } from "../middleware/auth.js";
import type { TaskDto, TaskService } from "../services/task.service.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

const task: TaskDto = {
  id: 1n,
  title: "Comprar café",
  description: "Molido, de comercio justo",
  status: "PENDING",
  priority: "HIGH",
  dueAt: new Date("2026-10-16T14:00:00.000Z"),
  completedAt: null,
  project: { id: 7n, name: "Personal OS" },
  createdAt: new Date("2026-10-16T00:00:00.000Z"),
  updatedAt: new Date("2026-10-16T00:00:00.000Z"),
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

function createFakeService(overrides: Partial<TaskService> = {}): TaskService {
  return {
    async list(_userId, query) {
      return { items: [task], total: 1, page: query.page, pageSize: query.pageSize };
    },
    async groupByDay() {
      return [{ date: "2026-10-16", count: 1 }];
    },
    async get(_userId, id) {
      if (id !== task.id) {
        throw notFound("Tarea no encontrada");
      }
      return task;
    },
    async create(_userId, input) {
      return { ...task, title: input.title, priority: input.priority };
    },
    async update(_userId, id, input) {
      if (id !== task.id) {
        throw notFound("Tarea no encontrada");
      }
      return { ...task, ...input };
    },
    async toggle(_userId, id) {
      if (id !== task.id) {
        throw notFound("Tarea no encontrada");
      }
      return { ...task, status: "COMPLETED" };
    },
    async delete(_userId, id) {
      if (id !== task.id) {
        throw notFound("Tarea no encontrada");
      }
    },
    ...overrides,
  };
}

function buildAppWith(service: TaskService): FastifyInstance {
  return buildApp({
    dependencies: {
      auth: createAuthHook({ verifier, users }),
      tasks: service,
    },
  });
}

const authHeader = { authorization: "Bearer valid-token" };

describe("rutas de tareas (protegidas)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("responde 401 sin token", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/tasks" });
    expect(response.statusCode).toBe(401);
  });

  it("GET /tasks devuelve el envelope con paginación", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/tasks?page=1&pageSize=10",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "1",
      title: "Comprar café",
      status: "PENDING",
      priority: "HIGH",
      project: { id: "7", name: "Personal OS" },
    });
    expect(body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("GET /tasks?groupByDay=true devuelve los conteos por día", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/tasks?groupByDay=true",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([{ date: "2026-10-16", count: 1 }]);
  });

  it("GET /tasks?groupByDay=true reenvía la zona horaria al servicio", async () => {
    let received: string | undefined;
    app = buildAppWith(
      createFakeService({
        async groupByDay(_userId, query) {
          received = query.tz;
          return [{ date: "2026-10-17", count: 1 }];
        },
      }),
    );
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/tasks?groupByDay=true&tz=America/Bogota",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(received).toBe("America/Bogota");
    expect(response.json().data).toEqual([{ date: "2026-10-17", count: 1 }]);
  });

  it("POST /tasks crea con 201 y aplica valores por defecto", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: authHeader,
      payload: { title: "Nueva tarea" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({ title: "Nueva tarea" });
  });

  it("POST /tasks rechaza prioridad inválida", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: authHeader,
      payload: { title: "X", priority: "URGENT" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("GET /tasks/:id devuelve 404 si no existe", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/tasks/999",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(404);
  });

  it("PUT /tasks/:id actualiza y devuelve 200", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/tasks/1",
      headers: authHeader,
      payload: { priority: "LOW" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.priority).toBe("LOW");
  });

  it("PATCH /tasks/:id/toggle devuelve la tarea completada", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/tasks/1/toggle",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe("COMPLETED");
  });

  it("DELETE /tasks/:id devuelve 204", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/tasks/1",
      headers: authHeader,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });
});
