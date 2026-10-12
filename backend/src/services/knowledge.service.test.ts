import { describe, expect, it } from "vitest";

import { AppError } from "../lib/errors.js";
import type {
  KnowledgeEntryWithTags,
  KnowledgeRepository,
} from "../repositories/knowledge.repository.js";
import { createKnowledgeService, normalizeTagNames } from "./knowledge.service.js";

/** Entrada de ejemplo tal como la devuelve el repositorio (con tags resueltos). */
function entry(overrides: Partial<KnowledgeEntryWithTags> = {}): KnowledgeEntryWithTags {
  return {
    id: 1n,
    userId: 1n,
    title: "Nota",
    content: "contenido",
    category: "Programming",
    createdAt: new Date("2026-10-11T10:00:00.000Z"),
    updatedAt: new Date("2026-10-11T10:00:00.000Z"),
    tags: [{ id: 5n, name: "typescript", createdAt: new Date("2026-10-11T10:00:00.000Z") }],
    ...overrides,
  };
}

/** Repositorio simulado; cada método se puede sobreescribir por test. */
function fakeRepository(overrides: Partial<KnowledgeRepository> = {}): KnowledgeRepository {
  return {
    async list() {
      return { items: [entry()], total: 1 };
    },
    async findById() {
      return entry();
    },
    async create(_userId, data) {
      return entry({ title: data.title, content: data.content, category: data.category });
    },
    async update() {
      return entry();
    },
    async delete() {
      return true;
    },
    async listTags() {
      return [{ id: 5n, name: "typescript", createdAt: new Date("2026-10-11T10:00:00.000Z") }];
    },
    ...overrides,
  };
}

describe("normalizeTagNames", () => {
  it("recorta, pasa a minúsculas y elimina duplicados conservando el orden", () => {
    expect(normalizeTagNames(["  TypeScript ", "typescript", "Prisma "])).toEqual([
      "typescript",
      "prisma",
    ]);
  });

  it("descarta cadenas vacías", () => {
    expect(normalizeTagNames(["", "  ", "linux"])).toEqual(["linux"]);
  });
});

describe("KnowledgeService", () => {
  it("create normaliza los tags antes de persistir", async () => {
    let received: string[] | undefined;
    const service = createKnowledgeService(
      fakeRepository({
        async create(_userId, data) {
          received = data.tags;
          return entry();
        },
      }),
    );

    await service.create(1n, {
      title: "T",
      content: "c",
      category: "Programming",
      tags: ["  TypeScript ", "TYPESCRIPT", "Prisma"],
    });

    expect(received).toEqual(["typescript", "prisma"]);
  });

  it("update solo reemplaza los tags cuando se envían", async () => {
    let receivedTags: string[] | undefined | null = null;
    const repository = fakeRepository({
      async update() {
        return entry();
      },
    });
    const original = repository.update;
    repository.update = async (userId, id, data) => {
      receivedTags = data.tags;
      return original(userId, id, data);
    };

    const service = createKnowledgeService(repository);

    await service.update(1n, 1n, { title: "solo titulo" });
    expect(receivedTags).toBeUndefined();

    await service.update(1n, 1n, { tags: ["Node "] });
    expect(receivedTags).toEqual(["node"]);
  });

  it("get lanza NOT_FOUND si el repositorio no encuentra la entrada", async () => {
    const service = createKnowledgeService(
      fakeRepository({
        async findById() {
          return null;
        },
      }),
    );

    await expect(service.get(1n, 999n)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update lanza NOT_FOUND si la entrada no existe", async () => {
    const service = createKnowledgeService(
      fakeRepository({
        async update() {
          return null;
        },
      }),
    );

    await expect(service.update(1n, 999n, { title: "x" })).rejects.toBeInstanceOf(AppError);
  });

  it("delete lanza NOT_FOUND si no se borró ninguna fila", async () => {
    const service = createKnowledgeService(
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

  it("list normaliza el filtro por tag a minúsculas y mapea los dtos", async () => {
    let receivedTag: string | undefined;
    const service = createKnowledgeService(
      fakeRepository({
        async list(params) {
          receivedTag = params.tag;
          return { items: [entry()], total: 1 };
        },
      }),
    );

    const result = await service.list(1n, { tag: "TypeScript", page: 2, pageSize: 5 });

    expect(receivedTag).toBe("typescript");
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 5 });
    expect(result.items[0]).toMatchObject({ id: 1n, tags: ["typescript"] });
  });
});
