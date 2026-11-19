import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeRow {
  id: bigint;
  updatedAt: Date;
  createdAt: Date;
}

interface FindManyArgs {
  where?: { createdAt?: { gte?: Date }; AND?: unknown[] };
  skip?: number;
  take?: number;
}

const knowledgeRows: FakeRow[] = [];
const projectRows: FakeRow[] = [];

/** Simula `findMany` ordenado por updatedAt desc, id desc, con skip/take y `createdAt.gte`. */
function fakeFindMany(rows: FakeRow[]) {
  return vi.fn(async ({ where, skip = 0, take }: FindManyArgs) => {
    const from = where?.createdAt?.gte;
    const sorted = rows
      .filter((row) => !from || row.createdAt >= from)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || Number(b.id - a.id));
    return sorted.slice(skip, take === undefined ? undefined : skip + take);
  });
}

const prismaMock = {
  knowledgeEntry: {
    findMany: fakeFindMany(knowledgeRows),
    count: vi.fn(async () => knowledgeRows.length),
    groupBy: vi.fn(async () => []),
  },
  project: {
    findMany: fakeFindMany(projectRows),
    count: vi.fn(async () => projectRows.length),
    groupBy: vi.fn(async () => []),
  },
  tag: { count: vi.fn(async () => 0) },
  task: { count: vi.fn(async () => 0) },
};

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createSearchRepository } = await import("./search.repository.js");

function knowledge(id: number, day: number) {
  const date = new Date(Date.UTC(2026, 0, day));
  return {
    id: BigInt(id),
    title: `K${id}`,
    content: "",
    category: "NOTE",
    tags: [],
    updatedAt: date,
    createdAt: date,
  };
}

function project(id: number, day: number) {
  const date = new Date(Date.UTC(2026, 0, day));
  return {
    id: BigInt(id),
    name: `P${id}`,
    description: "",
    status: "ACTIVE",
    url: null,
    technologies: [],
    updatedAt: date,
    createdAt: date,
  };
}

describe("searchRepository.search con type 'all'", () => {
  beforeEach(() => {
    knowledgeRows.length = 0;
    projectRows.length = 0;
    // Conocimiento más reciente (días 20-23) y proyectos más antiguos (días 10-13).
    knowledgeRows.push(...[1, 2, 3, 4].map((id) => knowledge(id, 19 + id)));
    projectRows.push(...[1, 2, 3, 4].map((id) => project(id, 9 + id)));
  });

  async function titlesOfPage(page: number, pageSize: number) {
    const result = await createSearchRepository().search({
      userId: 1n,
      q: "",
      type: "all",
      page,
      pageSize,
    });
    return { titles: result.items.map((item) => item.title), total: result.total };
  }

  it("pagina sobre la lista combinada sin perder ni repetir resultados", async () => {
    const pages = await Promise.all([1, 2, 3, 4].map((page) => titlesOfPage(page, 3)));

    expect(pages.map((p) => p.titles)).toEqual([
      ["K4", "K3", "K2"],
      ["K1", "P4", "P3"],
      ["P2", "P1"],
      [],
    ]);
    expect(pages.every((p) => p.total === 8)).toBe(true);
  });

  it("intercala por fecha de actualización entre ambos tipos", async () => {
    projectRows.length = 0;
    projectRows.push(project(10, 22), project(11, 21));

    const { titles } = await titlesOfPage(2, 2);

    // Orden global (empate por id desc): K4(23) P10(22) K3(22) P11(21) K2(21) K1(20).
    expect(titles).toEqual(["K3", "P11"]);
  });
});

describe("searchRepository.metrics: actividad mensual", () => {
  const serverTimeZone = process.env.TZ;

  beforeEach(() => {
    // El servidor corre en UTC (como en Docker); el cliente está en Bogotá (UTC-5).
    process.env.TZ = "UTC";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
    knowledgeRows.length = 0;
    projectRows.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = serverTimeZone;
  });

  function createdAt(iso: string) {
    const date = new Date(iso);
    return { id: 1n, updatedAt: date, createdAt: date };
  }

  it("agrupa por mes en la zona horaria del cliente", async () => {
    // 1 nov 03:00Z = 31 oct 22:00 en Bogotá → octubre.
    knowledgeRows.push(createdAt("2026-11-01T03:00:00.000Z"));
    // 1 oct 03:00Z = 30 sep 22:00 en Bogotá → fuera de la ventana de 2 meses.
    projectRows.push(createdAt("2026-10-01T03:00:00.000Z"));

    const { activity } = await createSearchRepository().metrics(1n, 2, "America/Bogota");

    expect(activity).toEqual([
      { month: "2026-10", knowledge: 1, projects: 0 },
      { month: "2026-11", knowledge: 0, projects: 0 },
    ]);
  });

  it("sin zona horaria válida mantiene la hora del servidor", async () => {
    knowledgeRows.push(createdAt("2026-11-01T03:00:00.000Z"));

    const { activity } = await createSearchRepository().metrics(1n, 2, "Nope/Nowhere");

    expect(activity).toEqual([
      { month: "2026-10", knowledge: 0, projects: 0 },
      { month: "2026-11", knowledge: 1, projects: 0 },
    ]);
  });
});

describe("searchRepository.search con varias palabras", () => {
  beforeEach(() => {
    knowledgeRows.length = 0;
    projectRows.length = 0;
    prismaMock.knowledgeEntry.findMany.mockClear();
    prismaMock.project.findMany.mockClear();
  });

  function search(q: string, type: "all" | "knowledge" | "projects" = "all") {
    return createSearchRepository().search({ userId: 1n, q, type, page: 1, pageSize: 10 });
  }

  it("exige cada palabra en conocimiento, en cualquier orden", async () => {
    await search("docker backup");

    const { where } = prismaMock.knowledgeEntry.findMany.mock.calls[0]![0];
    expect(where?.AND).toHaveLength(2);
    expect(where?.AND?.[0]).toEqual({
      OR: [
        { title: { contains: "docker" } },
        { content: { contains: "docker" } },
        { tags: { some: { tag: { name: { contains: "docker" } } } } },
      ],
    });
  });

  it("exige cada palabra en proyectos", async () => {
    await search("docker backup");

    const { where } = prismaMock.project.findMany.mock.calls[0]![0];
    expect(where?.AND).toHaveLength(2);
    expect(where?.AND?.[0]).toEqual({
      OR: [
        { name: { contains: "docker" } },
        { description: { contains: "docker" } },
        { technologies: { some: { name: { contains: "docker" } } } },
      ],
    });
  });

  it("busca etiquetas y tecnologías en minúsculas", async () => {
    await search("Docker");

    const knowledgeWhere = prismaMock.knowledgeEntry.findMany.mock.calls[0]![0].where;
    const projectWhere = prismaMock.project.findMany.mock.calls[0]![0].where;
    expect(knowledgeWhere?.AND?.[0]).toMatchObject({
      OR: [
        { title: { contains: "Docker" } },
        { content: { contains: "Docker" } },
        { tags: { some: { tag: { name: { contains: "docker" } } } } },
      ],
    });
    expect(projectWhere?.AND?.[0]).toMatchObject({
      OR: [
        { name: { contains: "Docker" } },
        { description: { contains: "Docker" } },
        { technologies: { some: { name: { contains: "docker" } } } },
      ],
    });
  });

  it("el snippet encuentra la palabra sin distinguir mayúsculas ni tildes", async () => {
    const row = knowledge(1, 1);
    row.content = `${"x".repeat(200)} Café ${"y".repeat(200)}`;
    knowledgeRows.push(row);

    const { items } = await search("cafe", "knowledge");

    const snippet = items[0]?.snippet ?? "";
    expect(snippet.startsWith("… ")).toBe(true);
    expect(snippet.endsWith(" …")).toBe(true);
    // La ventana está centrada en "Café": como mucho 60 caracteres antes.
    const before = snippet.slice(2, snippet.indexOf("Café"));
    expect(snippet).toContain("Café");
    expect(before.length).toBeLessThanOrEqual(60);
  });

  it("el snippet usa el inicio del texto si ninguna palabra aparece", async () => {
    const row = knowledge(1, 1);
    row.content = "y".repeat(200);
    knowledgeRows.push(row);

    const { items } = await search("zzz", "knowledge");

    expect(items[0]?.snippet).toBe(`${"y".repeat(160)}…`);
  });
});
