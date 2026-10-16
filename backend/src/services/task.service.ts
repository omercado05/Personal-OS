import { notFound } from "../lib/errors.js";
import {
  createTaskRepository,
  type TaskRepository,
  type TaskWithProject,
  type TaskDayCount,
} from "../repositories/task.repository.js";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "../schemas/task.schema.js";

export interface TaskProjectRefDto {
  id: bigint;
  name: string;
}

export interface TaskDto {
  id: bigint;
  title: string;
  description: string | null;
  status: "PENDING" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueAt: Date | null;
  completedAt: Date | null;
  project: TaskProjectRefDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTasksResult {
  items: TaskDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskService {
  list(userId: bigint, query: ListTasksQuery): Promise<ListTasksResult>;
  groupByDay(
    userId: bigint,
    query: Omit<ListTasksQuery, "page" | "pageSize" | "groupByDay">,
  ): Promise<TaskDayCount[]>;
  get(userId: bigint, id: bigint): Promise<TaskDto>;
  create(userId: bigint, input: CreateTaskInput): Promise<TaskDto>;
  update(userId: bigint, id: bigint, input: UpdateTaskInput): Promise<TaskDto>;
  toggle(userId: bigint, id: bigint): Promise<TaskDto>;
  delete(userId: bigint, id: bigint): Promise<void>;
}

function toDto(entry: TaskWithProject): TaskDto {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    status: entry.status,
    priority: entry.priority,
    dueAt: entry.dueAt,
    completedAt: entry.completedAt,
    project: entry.project ? { id: entry.project.id, name: entry.project.name } : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function createTaskService(
  repository: TaskRepository = createTaskRepository(),
): TaskService {
  return {
    async list(userId, query) {
      const { items, total } = await repository.list({
        userId,
        q: query.q,
        status: query.status,
        priority: query.priority,
        projectId: query.projectId,
        from: query.from,
        to: query.to,
        overdue: query.overdue,
        dueToday: query.dueToday,
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

    async groupByDay(userId, query) {
      return repository.groupByDay({
        userId,
        q: query.q,
        status: query.status,
        priority: query.priority,
        projectId: query.projectId,
        from: query.from,
        to: query.to,
        overdue: query.overdue,
        dueToday: query.dueToday,
      });
    },

    async get(userId, id) {
      const entry = await repository.findById(userId, id);
      if (!entry) throw notFound("Tarea no encontrada");
      return toDto(entry);
    },

    async create(userId, input) {
      const entry = await repository.create(userId, {
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        dueAt: input.dueAt ?? null,
        projectId: input.projectId ?? null,
      });
      return toDto(entry);
    },

    async update(userId, id, input) {
      const entry = await repository.update(userId, id, {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueAt: input.dueAt,
        projectId: input.projectId,
      });
      if (!entry) throw notFound("Tarea no encontrada");
      return toDto(entry);
    },

    async toggle(userId, id) {
      const existing = await repository.findById(userId, id);
      if (!existing) throw notFound("Tarea no encontrada");
      const nextStatus = existing.status === "PENDING" ? "COMPLETED" : "PENDING";
      const entry = await repository.update(userId, id, { status: nextStatus });
      if (!entry) throw notFound("Tarea no encontrada");
      return toDto(entry);
    },

    async delete(userId, id) {
      const deleted = await repository.delete(userId, id);
      if (!deleted) throw notFound("Tarea no encontrada");
    },
  };
}
