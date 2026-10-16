import type { KnowledgeCategory, ProjectStatus, TaskPriority, TaskStatus } from "./constants";

/** Entrada de conocimiento tal como la devuelve la API (`id` es un string). */
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Proyecto tal como lo devuelve la API (`id` es un string). */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  url: string | null;
  repositoryUrl: string | null;
  technologies: string[];
  createdAt: string;
  updatedAt: string;
}

/** Tag global. */
export interface Tag {
  id: string;
  name: string;
}

/** Metadatos de paginación devueltos por el backend. */
export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Respuesta de listado: `{ data, meta }`. */
export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

/** Respuesta de recurso único: `{ data }`. */
export interface ItemResponse<T> {
  data: T;
}

/** Totales del panel (F11.3). */
export interface DashboardTotals {
  knowledge: number;
  projects: number;
  tags: number;
  categories: number;
}

/** Referencia mínima al proyecto vinculado a una tarea. */
export interface TaskProjectRef {
  id: string;
  name: string;
}

/** Tarea tal como la devuelve la API (`id` es un string). */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  project: TaskProjectRef | null;
  createdAt: string;
  updatedAt: string;
}

/** Conteo de tareas pendientes por día (`GET /api/v1/tasks?groupByDay=true`). */
export interface TaskDayCount {
  date: string;
  count: number;
}

/** Métricas agregadas del panel devueltas por `GET /api/v1/dashboard/metrics`. */
export interface DashboardMetrics {
  totals: DashboardTotals;
  knowledgeByCategory: { category: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  activity: { month: string; knowledge: number; projects: number }[];
  /** Tareas pendientes que vencen hoy. */
  tasksDueToday: number;
  /** Tareas pendientes vencidas (antes de ahora). */
  tasksOverdue: number;
}
