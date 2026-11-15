/**
 * Utilidades de zona horaria para decidir a qué «día» pertenece un instante.
 *
 * `dueAt` se guarda como instante (UTC). Para agrupar tareas por día hay que
 * elegir una zona horaria: la del navegador del usuario, no la del servidor
 * (que suele correr en UTC). Estas funciones usan `Intl` para respetar el
 * horario de verano en lugar de asumir un desplazamiento fijo.
 */

/** ¿Es `timeZone` una zona IANA que `Intl` reconoce? */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Devuelve `timeZone` si es válida; en caso contrario, `undefined`. */
export function resolveTimeZone(timeZone: string | undefined | null): string | undefined {
  if (!timeZone) {
    return undefined;
  }
  return isValidTimeZone(timeZone) ? timeZone : undefined;
}

function partsToRecord(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      record[part.type] = part.value;
    }
  }
  return record;
}

/** Formatea un instante como `YYYY-MM-DD` en la zona horaria dada. */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = partsToRecord(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Año, mes (1-12) y día del instante en la zona horaria dada. */
export function datePartsInTimeZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const [year, month, day] = formatDateInTimeZone(date, timeZone).split("-").map(Number);
  return { year: year ?? NaN, month: month ?? NaN, day: day ?? NaN };
}

/** Desplazamiento (ms) de `timeZone` respecto a UTC en el instante dado. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsToRecord(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * Medianoche local (como instante UTC) de la fecha de calendario dada en `timeZone`.
 * `monthIndex` empieza en 0 y, como en `Date.UTC`, los valores fuera de rango se
 * normalizan (p. ej. `monthIndex = -1` es diciembre del año anterior).
 */
export function zonedMidnight(
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string,
): Date {
  const wallClockAsUtc = Date.UTC(year, monthIndex, day);
  // El desplazamiento puede cambiar cerca de una transición de horario de verano,
  // así que se recalcula una vez sobre el instante corregido.
  const firstOffset = timeZoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  let result = wallClockAsUtc - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) {
    result = wallClockAsUtc - secondOffset;
  }
  return new Date(result);
}

/** Medianoche local (como instante UTC) del día al que pertenece `date` en `timeZone`. */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const { year, month, day } = datePartsInTimeZone(date, timeZone);
  return zonedMidnight(year, month - 1, day, timeZone);
}

/** Último milisegundo del día local al que pertenece `date` en `timeZone`. */
export function endOfDayInTimeZone(date: Date, timeZone: string): Date {
  const start = startOfDayInTimeZone(date, timeZone);
  // 26 h desde la medianoche local caen siempre en el día siguiente (los días
  // locales duran entre 23 y 25 h), de modo que el inicio del siguiente día
  // menos 1 ms cierra el día actual incluso con horario de verano.
  const nextDayStart = startOfDayInTimeZone(
    new Date(start.getTime() + 26 * 60 * 60 * 1000),
    timeZone,
  );
  return new Date(nextDayStart.getTime() - 1);
}
