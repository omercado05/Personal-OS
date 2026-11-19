import { describe, expect, it } from "vitest";
import { groupByRecency, groupTasksByDue } from "./timeline";

// Jueves 19 de noviembre de 2026, 10:00 local.
const now = new Date(2026, 10, 19, 10, 0);
const iso = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

describe("groupByRecency", () => {
  it("reparte cada fecha en su grupo y respeta el orden fijo", () => {
    const items = [
      { id: "older", at: iso(2026, 10, 31, 23, 59) },
      { id: "month-1", at: iso(2026, 11, 1) },
      { id: "month-2", at: iso(2026, 11, 15, 12) },
      { id: "week", at: iso(2026, 11, 16, 23, 59) },
      { id: "today", at: iso(2026, 11, 19, 8) },
    ];
    const groups = groupByRecency(items, (i) => i.at, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "week", "month", "older"]);
    expect(groups.map((g) => g.label)).toEqual(["Hoy", "Esta semana", "Este mes", "Antes"]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["today"],
      ["week"],
      ["month-1", "month-2"],
      ["older"],
    ]);
  });

  it("devuelve una lista vacía sin ítems", () => {
    expect(groupByRecency([], () => "", now)).toEqual([]);
  });

  it("omite los grupos vacíos", () => {
    const groups = groupByRecency([{ at: iso(2026, 1, 5) }], (i) => i.at, now);
    expect(groups.map((g) => g.key)).toEqual(["older"]);
  });
});

describe("groupTasksByDue", () => {
  const task = (id: string, dueAt: string | null, status: "PENDING" | "COMPLETED") => ({
    id,
    dueAt,
    status,
  });

  it("clasifica por vencimiento y estado en el orden fijo", () => {
    const tasks = [
      task("past", iso(2026, 11, 18, 18), "COMPLETED"),
      task("none", null, "PENDING"),
      task("upcoming", iso(2026, 11, 20), "PENDING"),
      task("today-done", iso(2026, 11, 19, 8), "COMPLETED"),
      task("today", iso(2026, 11, 19, 23, 59), "PENDING"),
      task("overdue", iso(2026, 11, 18, 18), "PENDING"),
    ];
    const groups = groupTasksByDue(tasks, now);
    expect(groups.map((g) => g.key)).toEqual(["overdue", "today", "upcoming", "none", "past"]);
    expect(groups.map((g) => g.label)).toEqual([
      "Vencidas",
      "Hoy",
      "Próximas",
      "Sin fecha",
      "Anteriores",
    ]);
    expect(groups.map((g) => g.items.map((t) => t.id))).toEqual([
      ["overdue"],
      ["today-done", "today"],
      ["upcoming"],
      ["none"],
      ["past"],
    ]);
  });

  it("devuelve una lista vacía sin tareas", () => {
    expect(groupTasksByDue([], now)).toEqual([]);
  });
});
