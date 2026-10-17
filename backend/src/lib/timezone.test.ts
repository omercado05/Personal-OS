import { describe, expect, it } from "vitest";

import {
  endOfDayInTimeZone,
  formatDateInTimeZone,
  isValidTimeZone,
  resolveTimeZone,
  startOfDayInTimeZone,
} from "./timezone.js";

describe("timezone", () => {
  it("valida zonas IANA y descarta las inválidas", () => {
    expect(isValidTimeZone("America/Bogota")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Nope/Nowhere")).toBe(false);
    expect(resolveTimeZone("America/Bogota")).toBe("America/Bogota");
    expect(resolveTimeZone("Nope/Nowhere")).toBeUndefined();
    expect(resolveTimeZone(undefined)).toBeUndefined();
    expect(resolveTimeZone("")).toBeUndefined();
  });

  it("formatea el día local del instante, no el día UTC", () => {
    // 2026-10-18T04:55Z es el 17 por la noche en Bogotá (UTC-5).
    const due = new Date("2026-10-18T04:55:00.000Z");
    expect(formatDateInTimeZone(due, "America/Bogota")).toBe("2026-10-17");
    expect(formatDateInTimeZone(due, "UTC")).toBe("2026-10-18");
  });

  it("startOfDayInTimeZone devuelve la medianoche local como instante UTC", () => {
    const due = new Date("2026-10-18T04:55:00.000Z");
    expect(startOfDayInTimeZone(due, "America/Bogota").toISOString()).toBe(
      "2026-10-17T05:00:00.000Z",
    );
  });

  it("endOfDayInTimeZone devuelve el último ms del día local", () => {
    const due = new Date("2026-10-18T04:55:00.000Z");
    expect(endOfDayInTimeZone(due, "America/Bogota").toISOString()).toBe(
      "2026-10-18T04:59:59.999Z",
    );
  });

  it("respeta el inicio del horario de verano (DST)", () => {
    // America/New_York cambia a EDT (UTC-4) el 2026-03-08 a las 02:00.
    const beforeDst = new Date("2026-03-08T05:00:00.000Z");
    expect(startOfDayInTimeZone(beforeDst, "America/New_York").toISOString()).toBe(
      "2026-03-08T05:00:00.000Z",
    );
    const afterDst = new Date("2026-03-09T12:00:00.000Z");
    expect(startOfDayInTimeZone(afterDst, "America/New_York").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
  });

  it("cierra correctamente un día de 25 h (fin del DST)", () => {
    const day = new Date("2026-11-01T12:00:00.000Z");
    const nextStart = startOfDayInTimeZone(
      new Date("2026-11-02T12:00:00.000Z"),
      "America/New_York",
    );
    expect(endOfDayInTimeZone(day, "America/New_York").getTime()).toBe(nextStart.getTime() - 1);
  });
});
