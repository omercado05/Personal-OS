import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../lib/errors.js";
import { success } from "../lib/http.js";
import { validateOrThrow } from "../middleware/validate.js";
import {
  createKnowledgeSchema,
  knowledgeIdParamsSchema,
  listKnowledgeQuerySchema,
  updateKnowledgeSchema,
} from "../schemas/knowledge.schema.js";
import type { KnowledgeService } from "../services/knowledge.service.js";

/**
 * Devuelve el id del usuario autenticado. El hook de autenticación ya rellenó
 * `request.user`; la comprobación es defensiva.
 */
function requireUserId(request: FastifyRequest): bigint {
  if (!request.user) {
    throw unauthorized("No autenticado");
  }
  return request.user.id;
}

export interface KnowledgeController {
  list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  listTags(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

export function createKnowledgeController(service: KnowledgeService): KnowledgeController {
  return {
    async list(request, reply) {
      const userId = requireUserId(request);
      const query = validateOrThrow(listKnowledgeQuerySchema, request.query);
      const result = await service.list(userId, query);

      return reply.send(
        success(result.items, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        }),
      );
    },

    async get(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(knowledgeIdParamsSchema, request.params);
      const entry = await service.get(userId, id);

      return reply.send(success(entry));
    },

    async create(request, reply) {
      const userId = requireUserId(request);
      const input = validateOrThrow(createKnowledgeSchema, request.body);
      const entry = await service.create(userId, input);

      return reply.status(201).send(success(entry));
    },

    async update(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(knowledgeIdParamsSchema, request.params);
      const input = validateOrThrow(updateKnowledgeSchema, request.body);
      const entry = await service.update(userId, id, input);

      return reply.send(success(entry));
    },

    async remove(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(knowledgeIdParamsSchema, request.params);
      await service.delete(userId, id);

      return reply.status(204).send();
    },

    async listTags(_request, reply) {
      const tags = await service.listTags();

      return reply.send(success(tags));
    },
  };
}
