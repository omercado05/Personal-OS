import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  knowledgeEntry: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
  project: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
  task: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
};

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createKnowledgeRepository } = await import("./knowledge.repository.js");
const { createProjectRepository } = await import("./project.repository.js");
const { createTaskRepository } = await import("./task.repository.js");

interface CapturedCall {
  where: Record<string, unknown>;
}

/** `where` pasado a la primera llamada de un `findMany` simulado. */
function whereOf(findMany: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const call = findMany.mock.calls[0]?.[0] as CapturedCall | undefined;
  if (!call) throw new Error("findMany no fue llamado");
  return call.where;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("filtro q de knowledge.list", () => {
  it("exige cada palabra en título o contenido y conserva categoría y etiqueta", async () => {
    await createKnowledgeRepository().list({
      userId: 1n,
      q: "linux red",
      category: "Linux",
      tag: "redes",
      page: 1,
      pageSize: 10,
    });

    const where = whereOf(prismaMock.knowledgeEntry.findMany);
    expect(where.userId).toBe(1n);
    expect(where.category).toBe("Linux");
    expect(where.tags).toEqual({ some: { tag: { name: "redes" } } });
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual([
      { OR: [{ title: { contains: "linux" } }, { content: { contains: "linux" } }] },
      { OR: [{ title: { contains: "red" } }, { content: { contains: "red" } }] },
    ]);
    // El conteo usa el mismo filtro.
    expect(prismaMock.knowledgeEntry.count).toHaveBeenCalledWith({ where });
  });
});

describe("filtro q de project.list", () => {
  it("exige cada palabra en nombre, descripción o tecnología (en minúsculas) y conserva el estado", async () => {
    await createProjectRepository().list({
      userId: 1n,
      q: "API Rest",
      status: "paused",
      page: 1,
      pageSize: 10,
    });

    const where = whereOf(prismaMock.project.findMany);
    expect(where.userId).toBe(1n);
    expect(where.status).toBe("paused");
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual([
      {
        OR: [
          { name: { contains: "API" } },
          { description: { contains: "API" } },
          { technologies: { some: { name: { contains: "api" } } } },
        ],
      },
      {
        OR: [
          { name: { contains: "Rest" } },
          { description: { contains: "Rest" } },
          { technologies: { some: { name: { contains: "rest" } } } },
        ],
      },
    ]);
    expect(prismaMock.project.count).toHaveBeenCalledWith({ where });
  });
});

describe("filtro q de task.list y task.groupByDay", () => {
  const expectedAnd = [
    { OR: [{ title: { contains: "pagar" } }, { description: { contains: "pagar" } }] },
    { OR: [{ title: { contains: "luz" } }, { description: { contains: "luz" } }] },
  ];

  it("list exige cada palabra y conserva prioridad, proyecto, estado y fecha", async () => {
    const from = new Date("2026-01-01T00:00:00Z");
    await createTaskRepository().list({
      userId: 1n,
      q: "pagar luz",
      priority: "HIGH",
      projectId: 5n,
      status: "COMPLETED",
      from,
      page: 1,
      pageSize: 10,
    });

    const where = whereOf(prismaMock.task.findMany);
    expect(where.priority).toBe("HIGH");
    expect(where.projectId).toBe(5n);
    expect(where.status).toBe("COMPLETED");
    expect(where.dueAt).toEqual({ gte: from });
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual(expectedAnd);
  });

  it("groupByDay exige cada palabra y conserva pendientes, prioridad y proyecto", async () => {
    await createTaskRepository().groupByDay({
      userId: 1n,
      q: "pagar luz",
      priority: "LOW",
      projectId: 7n,
    });

    const where = whereOf(prismaMock.task.findMany);
    expect(where.status).toBe("PENDING");
    expect(where.priority).toBe("LOW");
    expect(where.projectId).toBe(7n);
    expect(where.dueAt).toEqual({ not: null });
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual(expectedAnd);
  });
});
