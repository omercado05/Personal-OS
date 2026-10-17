import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { unauthorized } from "../lib/errors.js";
import { createAuthHook } from "../middleware/auth.js";
import type {
  DashboardDto,
  DashboardMetricsDto,
  SearchResultDto,
  SearchService,
} from "../services/search.service.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

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

function createFakeService(overrides: Partial<SearchService> = {}): SearchService {
  return {
    async search(_userId, query) {
      const result: SearchResultDto = {
        items: [
          {
            kind: "knowledge",
            id: 1n,
            title: "Nota TS",
            snippet: "typescript",
            tags: ["typescript"],
            updatedAt: new Date("2026-10-12T00:00:00.000Z"),
            createdAt: new Date("2026-10-12T00:00:00.000Z"),
          },
        ],
        total: 1,
        page: query.page,
        pageSize: query.pageSize,
      };
      return result;
    },
    async dashboard(_userId) {
      const result: DashboardDto = {
        recentKnowledge: [],
        recentProjects: [],
      };
      return result;
    },
    async metrics(_userId) {
      const result: DashboardMetricsDto = {
        totals: { knowledge: 0, projects: 0, tags: 0, categories: 0 },
        knowledgeByCategory: [],
        projectsByStatus: [],
        activity: [],
        tasksDueToday: 0,
        tasksOverdue: 0,
      };
      return result;
    },
    ...overrides,
  };
}

function buildAppWith(service: SearchService): FastifyInstance {
  return buildApp({
    dependencies: {
      auth: createAuthHook({ verifier, users }),
      search: service,
    },
  });
}

const authHeader = { authorization: "Bearer valid-token" };

describe("rutas de search y dashboard (protegidas)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("GET /search requiere token", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/search?q=test" });
    expect(response.statusCode).toBe(401);
  });

  it("GET /search valida q requerido", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/search",
      headers: authHeader,
    });
    expect(response.statusCode).toBe(400);
  });

  it("GET /search devuelve resultados con meta", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=ts&page=1&pageSize=10",
      headers: authHeader,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("GET /dashboard requiere token", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/dashboard" });
    expect(response.statusCode).toBe(401);
  });

  it("GET /dashboard devuelve datos agregados", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard",
      headers: authHeader,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { recentKnowledge: [], recentProjects: [] } });
  });

  it("GET /dashboard/metrics requiere token", async () => {
    app = buildAppWith(createFakeService());
    const response = await app.inject({ method: "GET", url: "/api/v1/dashboard/metrics" });
    expect(response.statusCode).toBe(401);
  });

  it("GET /dashboard/metrics devuelve agregados", async () => {
    app = buildAppWith(
      createFakeService({
        async metrics() {
          return {
            totals: { knowledge: 3, projects: 2, tags: 1, categories: 2 },
            knowledgeByCategory: [{ category: "Programming", count: 3 }],
            projectsByStatus: [{ status: "idea", count: 2 }],
            activity: [{ month: "2026-10", knowledge: 3, projects: 2 }],
            tasksDueToday: 4,
            tasksOverdue: 1,
          };
        },
      }),
    );
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/metrics",
      headers: authHeader,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        totals: { knowledge: 3, projects: 2, tags: 1, categories: 2 },
        knowledgeByCategory: [{ category: "Programming", count: 3 }],
        projectsByStatus: [{ status: "idea", count: 2 }],
        activity: [{ month: "2026-10", knowledge: 3, projects: 2 }],
        tasksDueToday: 4,
        tasksOverdue: 1,
      },
    });
  });

  it("GET /dashboard/metrics reenvía la zona horaria al servicio", async () => {
    let received: string | undefined;
    app = buildAppWith(
      createFakeService({
        async metrics(_userId, _months, timeZone) {
          received = timeZone;
          return {
            totals: { knowledge: 0, projects: 0, tags: 0, categories: 0 },
            knowledgeByCategory: [],
            projectsByStatus: [],
            activity: [],
            tasksDueToday: 0,
            tasksOverdue: 0,
          };
        },
      }),
    );
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/metrics?tz=America/Bogota",
      headers: authHeader,
    });
    expect(response.statusCode).toBe(200);
    expect(received).toBe("America/Bogota");
  });
});
