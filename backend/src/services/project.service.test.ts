import { describe, expect, it } from "vitest";

import { AppError } from "../lib/errors.js";
import type {
  ProjectRepository,
  ProjectWithTechnologies,
} from "../repositories/project.repository.js";
import { createProjectService, normalizeTechnologyNames } from "./project.service.js";

function project(overrides: Partial<ProjectWithTechnologies> = {}): ProjectWithTechnologies {
  return {
    id: 1n,
    userId: 1n,
    name: "Personal OS",
    description: null,
    status: "in_progress",
    url: null,
    repositoryUrl: "https://github.com/user/personal-os",
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T00:00:00.000Z"),
    technologies: [{ projectId: 1n, name: "typescript" }],
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<ProjectRepository> = {}): ProjectRepository {
  return {
    async list() {
      return { items: [project()], total: 1 };
    },
    async findById() {
      return project();
    },
    async create(_userId, data) {
      return project({ name: data.name, status: data.status });
    },
    async update() {
      return project();
    },
    async delete() {
      return true;
    },
    ...overrides,
  };
}

describe("normalizeTechnologyNames", () => {
  it("normaliza, deduplica y descarta vacíos", () => {
    expect(normalizeTechnologyNames(["  TypeScript ", "typescript", "Next.js"])).toEqual([
      "typescript",
      "next.js",
    ]);
    expect(normalizeTechnologyNames(["", "   "])).toEqual([]);
  });
});

describe("ProjectService", () => {
  it("create normaliza las tecnologías antes de persistir", async () => {
    let received: string[] | undefined;
    const service = createProjectService(
      fakeRepository({
        async create(_userId, data) {
          received = data.technologies;
          return project();
        },
      }),
    );

    await service.create(1n, {
      name: "P",
      description: null,
      status: "idea",
      url: null,
      repositoryUrl: null,
      technologies: ["  Go ", "go", "Docker"],
    });

    expect(received).toEqual(["go", "docker"]);
  });

  it("update solo reemplaza tecnologías si se envían", async () => {
    let received: string[] | undefined | null = null;
    const repository = fakeRepository({
      async update() {
        return project();
      },
    });
    const original = repository.update;
    repository.update = async (userId, id, data) => {
      received = data.technologies;
      return original(userId, id, data);
    };

    const service = createProjectService(repository);
    await service.update(1n, 1n, { status: "completed" });
    expect(received).toBeUndefined();
    await service.update(1n, 1n, { technologies: ["Node"] });
    expect(received).toEqual(["node"]);
  });

  it("get lanza NOT_FOUND si no existe", async () => {
    const service = createProjectService(
      fakeRepository({
        async findById() {
          return null;
        },
      }),
    );
    await expect(service.get(1n, 999n)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update lanza NOT_FOUND si no existe", async () => {
    const service = createProjectService(
      fakeRepository({
        async update() {
          return null;
        },
      }),
    );
    await expect(service.update(1n, 999n, { name: "x" })).rejects.toBeInstanceOf(AppError);
  });

  it("delete lanza NOT_FOUND si no se borró", async () => {
    const service = createProjectService(
      fakeRepository({
        async delete() {
          return false;
        },
      }),
    );
    await expect(service.delete(1n, 999n)).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("list pasa filtros al repositorio", async () => {
    let statusReceived: string | undefined;
    const service = createProjectService(
      fakeRepository({
        async list(params) {
          statusReceived = params.status;
          return { items: [project()], total: 2 };
        },
      }),
    );

    const result = await service.list(1n, { status: "completed", page: 1, pageSize: 10 });
    expect(statusReceived).toBe("completed");
    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({ id: 1n });
  });
});
