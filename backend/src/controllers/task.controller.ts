import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../lib/errors.js";
import { success } from "../lib/http.js";
import { validateOrThrow } from "../middleware/validate.js";
import {
  createTaskSchema,
  taskIdParamsSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "../schemas/task.schema.js";
import type { TaskService } from "../services/task.service.js";

function requireUserId(request: FastifyRequest): bigint {
  if (!request.user) {
    throw unauthorized("No autenticado");
  }
  return request.user.id;
}

export interface TaskController {
  list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  toggle(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

export function createTaskController(service: TaskService): TaskController {
  return {
    async list(request, reply) {
      const userId = requireUserId(request);
      const query = validateOrThrow(listTasksQuerySchema, request.query);
      if (query.groupByDay) {
        const result = await service.groupByDay(userId, query);
        return reply.send(success(result));
      }
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
      const { id } = validateOrThrow(taskIdParamsSchema, request.params);
      const entry = await service.get(userId, id);
      return reply.send(success(entry));
    },

    async create(request, reply) {
      const userId = requireUserId(request);
      const input = validateOrThrow(createTaskSchema, request.body);
      const entry = await service.create(userId, input);
      return reply.status(201).send(success(entry));
    },

    async update(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(taskIdParamsSchema, request.params);
      const input = validateOrThrow(updateTaskSchema, request.body);
      const entry = await service.update(userId, id, input);
      return reply.send(success(entry));
    },

    async toggle(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(taskIdParamsSchema, request.params);
      const entry = await service.toggle(userId, id);
      return reply.send(success(entry));
    },

    async remove(request, reply) {
      const userId = requireUserId(request);
      const { id } = validateOrThrow(taskIdParamsSchema, request.params);
      await service.delete(userId, id);
      return reply.status(204).send();
    },
  };
}
