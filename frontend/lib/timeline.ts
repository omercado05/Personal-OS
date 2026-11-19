// Agrupación de listas por fecha para renderizarlas como línea de tiempo.
// Todo se calcula en hora local: la semana empieza el lunes y el mes el día 1.

export type RecencyGroupKey = "today" | "week" | "month" | "older";
export type DueGroupKey = "overdue" | "today" | "upcoming" | "none" | "past";

export interface TimelineGroup<K extends string, T> {
  key: K;
  label: string;
  items: T[];
}

const RECENCY_GROUPS: { key: RecencyGroupKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "older", label: "Antes" },
];

const DUE_GROUPS: { key: DueGroupKey; label: string }[] = [
  { key: "overdue", label: "Vencidas" },
  { key: "today", label: "Hoy" },
  { key: "upcoming", label: "Próximas" },
  { key: "none", label: "Sin fecha" },
  { key: "past", label: "Anteriores" },
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Reparte los ítems en los grupos dados (en su orden) y omite los vacíos.
function collect<K extends string, T>(
  defs: { key: K; label: string }[],
  items: T[],
  classify: (item: T) => K,
): TimelineGroup<K, T>[] {
  const buckets = new Map<K, T[]>(defs.map((d) => [d.key, []]));
  for (const item of items) buckets.get(classify(item))!.push(item);
  return defs
    .map((d) => ({ key: d.key, label: d.label, items: buckets.get(d.key)! }))
    .filter((g) => g.items.length > 0);
}

export function groupByRecency<T>(
  items: T[],
  getDate: (item: T) => string,
  now: Date = new Date(),
): TimelineGroup<RecencyGroupKey, T>[] {
  const today = startOfDay(now);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - daysSinceMonday,
  );
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return collect(RECENCY_GROUPS, items, (item) => {
    const date = new Date(getDate(item));
    if (date >= today) return "today"; // incluye fechas futuras por desfase de reloj
    if (date >= weekStart) return "week";
    if (date >= monthStart) return "month";
    return "older";
  });
}

export function groupTasksByDue<
  T extends { dueAt: string | null; status: "PENDING" | "COMPLETED" },
>(tasks: T[], now: Date = new Date()): TimelineGroup<DueGroupKey, T>[] {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return collect(DUE_GROUPS, tasks, (task) => {
    if (task.dueAt === null) return "none";
    const due = new Date(task.dueAt);
    if (due >= tomorrow) return "upcoming";
    if (due >= today) return "today";
    return task.status === "PENDING" ? "overdue" : "past";
  });
}
