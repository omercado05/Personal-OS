import { describe, expect, it } from "vitest";

import { AppError } from "../lib/errors.js";
import type { TaskRepository, TaskWithProject } from "../repositories/task.repository.js";
import { createTaskService } from "./task.service.js";

function task(overrides: Partial<TaskWithProject> = {}): TaskWithProject {
  return {
    id: 1n,
    userId: 1n,
    projectId: null,
    title: "Comprar café",
    description: null,
    status: "PENDING",
    priority: "MEDIUM",
    dueAt: new Date("2026-10-16T14:00:00.000Z"),
    completedAt: null,
    createdAt: new Date("2026-10-16T00:00:00.000Z"),
    updatedAt: new Date("2026-10-16T00:00:00.000Z"),
    project: null,
    ...overrides,
  };
}

function fakeRepository(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    async list() {
      return { items: [task()], total: 1 };
    },
    async groupByDay() {
      return [{ date: "2026-10-16", count: 1 }];
    },
    async findById() {
      return task();
    },
    async create(_userId, data) {
      return task({ title: data.title, priority: data.priority, status: data.status });
    },
    async update() {
      return task();
    },
    async delete() {
      return true;
    },
    ...overrides,
  };
}

describe("TaskService", () => {
  it("create rellena los valores por defecto y mapea el proyecto", async () => {
    let received: Parameters<TaskRepository["create"]>[1] | undefined;
    const service = createTaskService(
      fakeRepository({
        async create(_userId, data) {
          received = data;
          return task({
            priority: data.priority,
            project: {
              id: 7n,
              userId: 1n,
              name: "Personal OS",
              description: null,
              status: "in_progress",
              url: null,
              repositoryUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        },
      }),
    );

    const dto = await service.create(1n, {
      title: "Escribir tests",
      description: "  con vitest  ",
      status: "PENDING",
      priority: "HIGH",
      dueAt: new Date("2026-10-17T09:00:00.000Z"),
      projectId: 7n,
    });

    expect(received?.projectId).toBe(7n);
    expect(dto.project).toEqual({ id: 7n, name: "Personal OS" });
    expect(dto.priority).toBe("HIGH");
  });

  it("toggle alterna PENDING → COMPLETED", async () => {
    let nextStatus: string | undefined;
    const service = createTaskService(
      fakeRepository({
        async findById() {
          return task({ status: "PENDING" });
        },
        async update(_userId, _id, data) {
          nextStatus = data.status;
          return task({ status: "COMPLETED", completedAt: new Date() });
        },
      }),
    );

    const dto = await service.toggle(1n, 1n);
    expect(nextStatus).toBe("COMPLETED");
    expect(dto.status).toBe("COMPLETED");
  });

  it("toggle alterna COMPLETED → PENDING", async () => {
    let nextStatus: string | undefined;
    const service = createTaskService(
      fakeRepository({
        async findById() {
          return task({ status: "COMPLETED" });
        },
        async update(_userId, _id, data) {
          nextStatus = data.status;
          return task({ status: "PENDING" });
        },
      }),
    );

    await service.toggle(1n, 1n);
    expect(nextStatus).toBe("PENDING");
  });

  it("get lanza NOT_FOUND si no existe", async () => {
    const service = createTaskService(
      fakeRepository({
        async findById() {
          return null;
        },
      }),
    );
    await expect(service.get(1n, 999n)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update lanza NOT_FOUND si no existe", async () => {
    const service = createTaskService(
      fakeRepository({
        async update() {
          return null;
        },
      }),
    );
    await expect(service.update(1n, 999n, { title: "x" })).rejects.toBeInstanceOf(AppError);
  });

  it("delete lanza NOT_FOUND si no se borró", async () => {
    const service = createTaskService(
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

  it("list pasa los filtros y devuelve metadatos de paginación", async () => {
    let params: Parameters<TaskRepository["list"]>[0] | undefined;
    const service = createTaskService(
      fakeRepository({
        async list(input) {
          params = input;
          return { items: [task()], total: 3 };
        },
      }),
    );

    const result = await service.list(1n, {
      status: "PENDING",
      priority: "HIGH",
      page: 2,
      pageSize: 10,
    });

    expect(params?.priority).toBe("HIGH");
    expect(params?.page).toBe(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.items[0]).toMatchObject({ id: 1n, title: "Comprar café" });
  });

  it("groupByDay delega en el repositorio", async () => {
    const service = createTaskService(
      fakeRepository({
        async groupByDay() {
          return [
            { date: "2026-10-16", count: 2 },
            { date: "2026-10-18", count: 1 },
          ];
        },
      }),
    );

    const days = await service.groupByDay(1n, {});
    expect(days).toEqual([
      { date: "2026-10-16", count: 2 },
      { date: "2026-10-18", count: 1 },
    ]);
  });

  it("reenvía la zona horaria del cliente al repositorio", async () => {
    let listParams: Parameters<TaskRepository["list"]>[0] | undefined;
    let dayParams: Parameters<TaskRepository["groupByDay"]>[0] | undefined;
    const service = createTaskService(
      fakeRepository({
        async list(input) {
          listParams = input;
          return { items: [task()], total: 1 };
        },
        async groupByDay(input) {
          dayParams = input;
          return [{ date: "2026-10-17", count: 1 }];
        },
      }),
    );

    await service.list(1n, { tz: "America/Bogota", page: 1, pageSize: 20 });
    await service.groupByDay(1n, { tz: "America/Bogota" });

    expect(listParams?.timeZone).toBe("America/Bogota");
    expect(dayParams?.timeZone).toBe("America/Bogota");
  });
});
