/**
 * Fechas de las ofertas en la hora de la tienda.
 *
 * El dueño carga "desde / hasta" en su hora local (Argentina), pero el
 * servidor puede correr en UTC y el navegador en cualquier zona. Todo se
 * convierte con una zona fija, para que "termina a las 20:00" signifique
 * lo mismo en el panel, en la base y en la tienda.
 */
export const STORE_TIME_ZONE = "America/Argentina/Buenos_Aires";

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Partes de fecha/hora de un instante, vistas en una zona horaria. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function zoneOffset(timestamp: number, timeZone: string): number {
  const p = zonedParts(new Date(timestamp), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

/**
 * "2026-10-01T20:00" (valor de <input type="datetime-local">) en la zona
 * de la tienda -> instante UTC. Devuelve null si el texto no es una fecha
 * válida o si esa hora no existe en la zona (cambio de horario).
 */
export function zonedLocalToUtc(
  local: string,
  timeZone: string = STORE_TIME_ZONE,
): Date | null {
  const match = LOCAL_PATTERN.exec(local.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(guess)) return null;

  // Dos pasadas: el offset depende del instante (horario de verano).
  let result = guess - zoneOffset(guess, timeZone);
  result = guess - zoneOffset(result, timeZone);

  // Rechaza fechas imposibles (31/02) y horas inexistentes en la zona.
  const back = zonedParts(new Date(result), timeZone);
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    return null;
  }

  return new Date(result);
}

/** Instante -> "2026-10-01T20:00" en la zona de la tienda (para los inputs). */
export function utcToZonedLocal(
  date: Date,
  timeZone: string = STORE_TIME_ZONE,
): string {
  const p = zonedParts(date, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const displayFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: STORE_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "01/10/2026, 20:00" en la hora de la tienda. */
export function formatStoreDateTime(date: Date | string): string {
  return displayFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

/** Tiempo que falta hasta `endsAt`; todo en 0 si ya pasó. */
export function remainingUntil(endsAt: Date | string, now: number): Remaining {
  const end = typeof endsAt === "string" ? Date.parse(endsAt) : endsAt.getTime();
  const totalMs = Math.max(0, end - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}
