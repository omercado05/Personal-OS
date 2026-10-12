import { notFound } from "../lib/errors.js";
import {
  createKnowledgeRepository,
  type KnowledgeEntryWithTags,
  type KnowledgeRepository,
} from "../repositories/knowledge.repository.js";
import type {
  CreateKnowledgeInput,
  ListKnowledgeQuery,
  UpdateKnowledgeInput,
} from "../schemas/knowledge.schema.js";

/** Representación pública de una entrada de conocimiento. */
export interface KnowledgeEntryDto {
  id: bigint;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListKnowledgeResult {
  items: KnowledgeEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TagDto {
  id: bigint;
  name: string;
}

/** Lógica de conocimiento: normaliza tags, aplica not-found y da forma a la salida. */
export interface KnowledgeService {
  list(userId: bigint, query: ListKnowledgeQuery): Promise<ListKnowledgeResult>;
  get(userId: bigint, id: bigint): Promise<KnowledgeEntryDto>;
  create(userId: bigint, input: CreateKnowledgeInput): Promise<KnowledgeEntryDto>;
  update(userId: bigint, id: bigint, input: UpdateKnowledgeInput): Promise<KnowledgeEntryDto>;
  delete(userId: bigint, id: bigint): Promise<void>;
  listTags(): Promise<TagDto[]>;
}

/** Normaliza nombres de tag: recorta, pasa a minúsculas y elimina duplicados. */
export function normalizeTagNames(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const name = raw.trim().toLowerCase();
    if (name.length === 0 || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

function toDto(entry: KnowledgeEntryWithTags): KnowledgeEntryDto {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    tags: entry.tags.map((tag) => tag.name),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/** Construye el servicio de conocimiento (repositorio inyectable para tests). */
export function createKnowledgeService(
  repository: KnowledgeRepository = createKnowledgeRepository(),
): KnowledgeService {
  return {
    async list(userId, query) {
      const { items, total } = await repository.list({
        userId,
        category: query.category,
        tag: query.tag ? query.tag.toLowerCase() : undefined,
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
      });
      return {
        items: items.map(toDto),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    },

    async get(userId, id) {
      const entry = await repository.findById(userId, id);
      if (!entry) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
      return toDto(entry);
    },

    async create(userId, input) {
      const entry = await repository.create(userId, {
        title: input.title,
        content: input.content,
        category: input.category,
        tags: normalizeTagNames(input.tags),
      });
      return toDto(entry);
    },

    async update(userId, id, input) {
      const entry = await repository.update(userId, id, {
        title: input.title,
        content: input.content,
        category: input.category,
        tags: input.tags !== undefined ? normalizeTagNames(input.tags) : undefined,
      });
      if (!entry) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
      return toDto(entry);
    },

    async delete(userId, id) {
      const deleted = await repository.delete(userId, id);
      if (!deleted) {
        throw notFound("Entrada de conocimiento no encontrada");
      }
    },

    async listTags() {
      const tags = await repository.listTags();
      return tags.map((tag) => ({ id: tag.id, name: tag.name }));
    },
  };
}
