import type { KnowledgeEntry, Tag } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

/** Entrada de conocimiento con sus tags resueltos. */
export type KnowledgeEntryWithTags = KnowledgeEntry & { tags: Tag[] };

export interface ListKnowledgeParams {
  userId: bigint;
  category?: string;
  /** Nombre de tag (ya normalizado a minúsculas). */
  tag?: string;
  /** Búsqueda por texto en título y contenido. */
  q?: string;
  page: number;
  pageSize: number;
}

export interface CreateKnowledgeData {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface UpdateKnowledgeData {
  title?: string;
  content?: string;
  category?: string;
  /** Si se indica, reemplaza por completo los tags de la entrada. */
  tags?: string[];
}

/** Acceso a `knowledge_entries`, `tags` y su tabla puente. */
export interface KnowledgeRepository {
  list(params: ListKnowledgeParams): Promise<{ items: KnowledgeEntryWithTags[]; total: number }>;
  findById(userId: bigint, id: bigint): Promise<KnowledgeEntryWithTags | null>;
  create(userId: bigint, data: CreateKnowledgeData): Promise<KnowledgeEntryWithTags>;
  update(
    userId: bigint,
    id: bigint,
    data: UpdateKnowledgeData,
  ): Promise<KnowledgeEntryWithTags | null>;
  /** Devuelve `true` si existía una entrada del usuario con ese id. */
  delete(userId: bigint, id: bigint): Promise<boolean>;
  listTags(): Promise<Tag[]>;
}

/** Inclusión estándar para devolver cada entrada con sus tags. */
const tagsInclude = { tags: { include: { tag: true } } } as const;

type RawEntry = KnowledgeEntry & { tags: { tag: Tag }[] };

function toEntry(raw: RawEntry): KnowledgeEntryWithTags {
  return {
    ...raw,
    tags: raw.tags.map((link) => link.tag),
  };
}

/** Implementación sobre Prisma. Todas las consultas filtran por `userId`. */
export function createKnowledgeRepository(): KnowledgeRepository {
  return {
    async list(params) {
      const where = {
        userId: params.userId,
        ...(params.category ? { category: params.category } : {}),
        ...(params.tag ? { tags: { some: { tag: { name: params.tag } } } } : {}),
        ...(params.q
          ? { OR: [{ title: { contains: params.q } }, { content: { contains: params.q } }] }
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.knowledgeEntry.findMany({
          where,
          include: tagsInclude,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.knowledgeEntry.count({ where }),
      ]);

      return { items: rows.map(toEntry), total };
    },

    async findById(userId, id) {
      const row = await prisma.knowledgeEntry.findFirst({
        where: { id, userId },
        include: tagsInclude,
      });
      return row ? toEntry(row) : null;
    },

    async create(userId, data) {
      const created = await prisma.knowledgeEntry.create({
        data: {
          userId,
          title: data.title,
          content: data.content,
          category: data.category,
          // `connectOrCreate` reutiliza el tag si ya existe (name es único).
          tags: {
            create: data.tags.map((name) => ({
              tag: { connectOrCreate: { where: { name }, create: { name } } },
            })),
          },
        },
        include: tagsInclude,
      });
      return toEntry(created);
    },

    async update(userId, id, data) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.knowledgeEntry.findFirst({ where: { id, userId } });
        if (!existing) {
          return null;
        }

        await tx.knowledgeEntry.update({
          where: { id },
          data: {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.content !== undefined ? { content: data.content } : {}),
            ...(data.category !== undefined ? { category: data.category } : {}),
          },
        });

        if (data.tags !== undefined) {
          await tx.knowledgeEntryTag.deleteMany({ where: { knowledgeEntryId: id } });

          if (data.tags.length > 0) {
            for (const name of data.tags) {
              await tx.tag.upsert({ where: { name }, create: { name }, update: {} });
            }
            const tags = await tx.tag.findMany({ where: { name: { in: data.tags } } });
            await tx.knowledgeEntryTag.createMany({
              data: tags.map((tag) => ({ knowledgeEntryId: id, tagId: tag.id })),
            });
          }

          // Los tags que ya no usa ninguna entrada se eliminan.
          await tx.tag.deleteMany({ where: { knowledgeEntries: { none: {} } } });
        }

        const updated = await tx.knowledgeEntry.findUnique({
          where: { id },
          include: tagsInclude,
        });
        return updated ? toEntry(updated) : null;
      });
    },

    async delete(userId, id) {
      return prisma.$transaction(async (tx) => {
        const result = await tx.knowledgeEntry.deleteMany({ where: { id, userId } });
        if (result.count === 0) {
          return false;
        }
        await tx.tag.deleteMany({ where: { knowledgeEntries: { none: {} } } });
        return true;
      });
    },

    async listTags() {
      return prisma.tag.findMany({ orderBy: { name: "asc" } });
    },
  };
}
