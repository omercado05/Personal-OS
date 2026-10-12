import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../lib/errors.js";
import { success } from "../lib/http.js";
import { validateOrThrow } from "../middleware/validate.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "../schemas/project.schema.js";
import type { ProjectService } from "../services/project.service.js";

function requireUserId(request: FastifyRequest): bigint {
  if (!request.user) {
    throw unauthorized("No autenticado");
  }
  return request.user.id;
}

export interface ProjectController {
  list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

export function createProjectController(service: ProjectService): ProjectController {
  return {
    async list(request, reply) {
      const userId = requireUserId(request);
      const query = validateOrThrow(listProjectsQuerySchema, request.query);
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
      const { id } = validateOrThrow(projectIdParamsSchema, request.params);
      const project = await service.get(userId, id);

      return reply.send(success(project));
    },

    async create(request, reply) {
      const userId = requireUserId(request);
      const input = validateOrThrow(createProjectSchema, request.body);
      const project = await service.create(userId, input);

      return reply.status(201).send(success(project));
    },

    async update(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(projectIdParamsSchema, request.params);
      const input = validateOrThrow(updateProjectSchema, request.body);
      const project = await service.update(userId, id, input);

      return reply.send(success(project));
    },

    async remove(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(projectIdParamsSchema, request.params);
      await service.delete(userId, id);

      return reply.status(204).send();
    },
  };
}
