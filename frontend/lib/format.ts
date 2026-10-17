const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formatea una fecha ISO a texto legible en español (fecha + hora). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return DATE_TIME_FORMATTER.format(date);
}

/** Convierte texto separado por comas en una lista limpia (sin vacíos). */
export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Zona horaria IANA del navegador (p. ej. `America/Bogota`).
 *
 * El backend la usa para decidir a qué día pertenece `dueAt` y qué es «hoy»,
 * de modo que los días coincidan con los del calendario del usuario.
 */
export function clientTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
