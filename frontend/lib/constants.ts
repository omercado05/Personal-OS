/**
 * Listas fijas de categorías de conocimiento y estados de proyecto.
 *
 * Deben mantenerse sincronizadas con el backend:
 *  - `backend/src/schemas/knowledge.schema.ts` → `KNOWLEDGE_CATEGORIES`
 *  - `backend/src/schemas/project.schema.ts`   → `PROJECT_STATUSES`
 */

export const KNOWLEDGE_CATEGORIES = [
  "Programming",
  "Linux",
  "Networking",
  "Databases",
  "University",
  "Coffee",
  "Ideas",
  "Projects",
  "Other",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

/** Etiquetas legibles (en español) para cada categoría. */
export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  Programming: "Programación",
  Linux: "Linux",
  Networking: "Redes",
  Databases: "Bases de datos",
  University: "Universidad",
  Coffee: "Café",
  Ideas: "Ideas",
  Projects: "Proyectos",
  Other: "Otros",
};

export const PROJECT_STATUSES = [
  "idea",
  "planning",
  "in_progress",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Etiquetas legibles (en español) para cada estado de proyecto. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  planning: "Planificación",
  in_progress: "En progreso",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

export const TASK_STATUSES = ["PENDING", "COMPLETED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completada",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "var(--text-muted)",
  MEDIUM: "var(--accent)",
  HIGH: "var(--pending)",
};

export const TASK_OVERDUE_COLOR = "var(--danger)";
export const TASK_COMPLETED_COLOR = "var(--ok)";
