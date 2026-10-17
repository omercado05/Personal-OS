import type { ApiFn } from "./api";
import type { TaskPriority, TaskStatus } from "./constants";
import { clientTimeZone } from "./format";
import { buildQuery } from "./knowledge";
import type { ItemResponse, ListMeta, ListResponse, Task, TaskDayCount } from "./types";

/** Filtros de `GET /api/v1/tasks`. */
export interface TaskListParams {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  from?: string;
  to?: string;
  overdue?: boolean;
  dueToday?: boolean;
  groupByDay?: boolean;
  /** Zona horaria IANA a usar; por defecto, la del navegador. */
  tz?: string;
  page?: number;
  pageSize?: number;
}

/** Datos editables de una tarea (crear/actualizar). */
export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  projectId?: string | null;
}

/** Respuesta de `GET /api/v1/tasks?groupByDay=true`. */
export interface TaskDaysResponse {
  data: TaskDayCount[];
  meta?: ListMeta;
}

/**
 * Convierte los filtros a un querystring.
 *
 * Los booleanos solo se envían cuando son `true`: el backend usa
 * `z.coerce.boolean()`, que interpretaría cualquier cadena no vacía
 * (incluida `"false"`) como `true`.
 *
 * La zona horaria del navegador se añade siempre (salvo que se pase `tz`):
 * el backend agrupa por día y calcula «hoy» en esa zona.
 */
function toQuery(params: TaskListParams): Record<string, string | number | undefined> {
  return {
    q: params.q,
    status: params.status,
    priority: params.priority,
    projectId: params.projectId,
    from: params.from,
    to: params.to,
    overdue: params.overdue ? "true" : undefined,
    dueToday: params.dueToday ? "true" : undefined,
    groupByDay: params.groupByDay ? "true" : undefined,
    tz: params.tz ?? clientTimeZone(),
    page: params.page,
    pageSize: params.pageSize,
  };
}

export function listTasks(
  api: ApiFn,
  params: TaskListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Task>> {
  return api<ListResponse<Task>>(`/api/v1/tasks${buildQuery(toQuery(params))}`, { signal });
}

export function listTaskDays(
  api: ApiFn,
  params: Omit<TaskListParams, "groupByDay">,
  signal?: AbortSignal,
): Promise<TaskDaysResponse> {
  return api<TaskDaysResponse>(
    `/api/v1/tasks${buildQuery(toQuery({ ...params, groupByDay: true }))}`,
    { signal },
  );
}

export function getTask(api: ApiFn, id: string, signal?: AbortSignal): Promise<ItemResponse<Task>> {
  return api<ItemResponse<Task>>(`/api/v1/tasks/${id}`, { signal });
}

export function createTask(api: ApiFn, input: TaskInput): Promise<ItemResponse<Task>> {
  return api<ItemResponse<Task>>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(
  api: ApiFn,
  id: string,
  input: Partial<TaskInput>,
): Promise<ItemResponse<Task>> {
  return api<ItemResponse<Task>>(`/api/v1/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function toggleTask(api: ApiFn, id: string): Promise<ItemResponse<Task>> {
  return api<ItemResponse<Task>>(`/api/v1/tasks/${id}/toggle`, {
    method: "PATCH",
  });
}

export function deleteTask(api: ApiFn, id: string): Promise<null> {
  return api<null>(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

/** Convierte un instante ISO a un valor de `<input type="datetime-local">` (hora local). */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Convierte un valor de `<input type="datetime-local">` (hora local) a un instante ISO. */
export function localInputToIso(value: string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}
