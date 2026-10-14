import type { ProjectStatus } from "./constants";

/** Paleta para series de gráficos (cian → verde → violeta → ámbar → azul → rosa). */
export const CHART_PALETTE = [
  "#22d3ee",
  "#22c55e",
  "#8b5cf6",
  "#f59e0b",
  "#38bdf8",
  "#f472b6",
] as const;

/**
 * Color por estado de proyecto. Sigue la semántica del tema: el cian queda para
 * «en progreso» (marca) y el verde para «completado» (éxito).
 */
export const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: "#8b5cf6",
  planning: "#38bdf8",
  in_progress: "#22d3ee",
  paused: "#f59e0b",
  completed: "#22c55e",
  archived: "#64748b",
};

/** Estilo compartido de los tooltips de Recharts. */
export const TOOLTIP_STYLE = {
  background: "#0e1119",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 12,
  fontSize: 12,
  padding: "0.5rem 0.7rem",
  color: "#e6e9f2",
} as const;

/** Estilo de la etiqueta de los tooltips de Recharts. */
export const TOOLTIP_LABEL_STYLE = { color: "#8b93a7", marginBottom: 4 } as const;

/** Color del texto de ejes y cuadrículas (coincide con `--text-muted`/bordes). */
export const AXIS_COLOR = "#8b93a7";
export const GRID_COLOR = "rgba(255, 255, 255, 0.06)";
