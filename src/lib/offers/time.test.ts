import { describe, expect, it } from "vitest";
import {
  formatStoreDateTime,
  remainingUntil,
  utcToZonedLocal,
  zonedLocalToUtc,
} from "./time";

describe("zonedLocalToUtc (hora de Argentina, UTC-3)", () => {
  it("convierte la hora cargada en el panel al instante UTC", () => {
    expect(zonedLocalToUtc("2026-10-01T20:00")?.toISOString()).toBe(
      "2026-10-01T23:00:00.000Z",
    );
  });

  it("cruza el cambio de día en UTC", () => {
    expect(zonedLocalToUtc("2026-12-31T22:30")?.toISOString()).toBe(
      "2027-01-01T01:30:00.000Z",
    );
  });

  it("rechaza formatos y fechas imposibles", () => {
    expect(zonedLocalToUtc("")).toBeNull();
    expect(zonedLocalToUtc("2026-10-01")).toBeNull();
    expect(zonedLocalToUtc("2026-02-31T10:00")).toBeNull();
    expect(zonedLocalToUtc("2026-10-01T25:00")).toBeNull();
  });

  it("respeta el horario de verano de otras zonas", () => {
    // Nueva York: 1/7 es EDT (UTC-4); 2:30 del 8/3/2026 no existe (salto).
    expect(zonedLocalToUtc("2026-07-01T12:00", "America/New_York")?.toISOString()).toBe(
      "2026-07-01T16:00:00.000Z",
    );
    expect(zonedLocalToUtc("2026-03-08T02:30", "America/New_York")).toBeNull();
  });

  it("ida y vuelta con utcToZonedLocal", () => {
    const local = "2026-11-15T09:45";
    expect(utcToZonedLocal(zonedLocalToUtc(local)!)).toBe(local);
  });
});

describe("formatStoreDateTime", () => {
  it("muestra en hora de la tienda sin importar la zona del servidor", () => {
    expect(formatStoreDateTime("2026-10-01T23:00:00.000Z")).toContain("20:00");
  });
});

describe("remainingUntil (contador)", () => {
  const end = "2026-10-03T23:00:00.000Z";
  const endMs = Date.parse(end);

  it("descompone el tiempo restante", () => {
    const remaining = remainingUntil(end, endMs - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
    expect(remaining).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("llega a cero al vencer y no pasa a negativo", () => {
    expect(remainingUntil(end, endMs).totalMs).toBe(0);
    expect(remainingUntil(end, endMs + 60_000)).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
  });
});
