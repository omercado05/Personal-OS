import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../lib/errors.js";
import { success } from "../lib/http.js";
import { validateOrThrow } from "../middleware/validate.js";
import { searchQuerySchema } from "../schemas/search.schema.js";
import type { SearchService } from "../services/search.service.js";

function requireUserId(request: FastifyRequest): bigint {
  if (!request.user) {
    throw unauthorized("No autenticado");
  }
  return request.user.id;
}

export interface SearchController {
  search(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  dashboard(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  metrics(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  tags(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

export function createSearchController(service: SearchService): SearchController {
  return {
    async search(request, reply) {
      const userId = requireUserId(request);
      const query = validateOrThrow(searchQuerySchema, request.query);
      const result = await service.search(userId, query);

      return reply.send(
        success(result.items, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        }),
      );
    },

    async dashboard(request, reply) {
      const userId = requireUserId(request);
      const result = await service.dashboard(userId);
      return reply.send(success(result));
    },

    async metrics(request, reply) {
      const userId = requireUserId(request);
      const result = await service.metrics(userId);
      return reply.send(success(result));
    },

    async tags(request, reply) {
      requireUserId(request);
      return reply.send(success([]));
    },
  };
}
