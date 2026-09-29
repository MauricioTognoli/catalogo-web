/**
 * Reglas de las ofertas temporales. Funciones puras (el "ahora" siempre
 * entra por parámetro) para poder probar inicio, fin y límites de fechas.
 *
 * Una oferta vale en el intervalo [inicio, fin): arranca exactamente en
 * starts_at y ya no vale en ends_at. Mismo criterio que la restricción de
 * exclusión de la base (tstzrange '[)').
 */

export const MIN_DURATION_MS = 15 * 60 * 1000; // 15 minutos
export const MAX_DURATION_DAYS = 90;
export const MAX_START_AHEAD_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export type OfferWindow = {
  startsAt: Date | string;
  endsAt: Date | string;
};

export type OfferLike = OfferWindow & {
  enabled: boolean;
  offerPrice: number;
};

export type OfferStatus = "disabled" | "scheduled" | "active" | "ended";

function time(value: Date | string): number {
  return typeof value === "string" ? Date.parse(value) : value.getTime();
}

export function isWithinWindow(offer: OfferWindow, now: number): boolean {
  return time(offer.startsAt) <= now && now < time(offer.endsAt);
}

/** Estado para el panel. "Finalizada" gana sobre "desactivada": ya no importa. */
export function offerStatus(offer: OfferLike, now: number): OfferStatus {
  if (now >= time(offer.endsAt)) return "ended";
  if (!offer.enabled) return "disabled";
  if (now < time(offer.startsAt)) return "scheduled";
  return "active";
}

export type EffectivePrice = {
  /** Precio a cobrar ahora. */
  price: number;
  /** Precio normal tachado, solo si hay oferta vigente. */
  compareAtPrice: number | null;
  /** Fin real de la oferta vigente (ISO), para el contador. */
  offerEndsAt: string | null;
};

/**
 * Precio vigente de un producto. Una oferta solo aplica si está
 * habilitada, dentro de su período y es MÁS BARATA que el precio normal
 * actual (si el dueño bajó el precio normal después, la oferta se ignora
 * en vez de cobrar más caro "en oferta").
 */
export function effectivePrice(
  regularPrice: number,
  offers: OfferLike[],
  now: number,
): EffectivePrice {
  const applicable = offers
    .filter(
      (offer) =>
        offer.enabled &&
        isWithinWindow(offer, now) &&
        offer.offerPrice > 0 &&
        offer.offerPrice < regularPrice,
    )
    // La base impide superposiciones; si igual hubiera dos, la más barata.
    .sort((a, b) => a.offerPrice - b.offerPrice);

  const offer = applicable[0];
  if (!offer) {
    return { price: regularPrice, compareAtPrice: null, offerEndsAt: null };
  }

  return {
    price: offer.offerPrice,
    compareAtPrice: regularPrice,
    offerEndsAt: new Date(time(offer.endsAt)).toISOString(),
  };
}

/** Porcentaje de descuento redondeado hacia abajo (nunca prometer de más). */
export function discountPercent(regularPrice: number, offerPrice: number): number {
  if (regularPrice <= 0 || offerPrice >= regularPrice) return 0;
  return Math.floor(((regularPrice - offerPrice) / regularPrice) * 100);
}

type Result = { ok: true } | { ok: false; error: string };

/**
 * Valida precio y fechas de una oferta al crearla o editarla.
 * - Precio promocional > 0 y menor al precio normal.
 * - Fin posterior al inicio, con una duración mínima y máxima.
 * - No se guarda una oferta ya vencida ni una que empieza a más de un año.
 * El inicio puede estar en el pasado (una oferta que ya arrancó).
 */
export function validateOffer(input: {
  offerPrice: number;
  regularPrice: number;
  startsAt: Date;
  endsAt: Date;
  now: number;
}): Result {
  const { offerPrice, regularPrice, startsAt, endsAt, now } = input;

  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    return { ok: false, error: "El precio promocional debe ser mayor a 0." };
  }
  if (offerPrice >= regularPrice) {
    return {
      ok: false,
      error: "El precio promocional tiene que ser menor al precio normal del producto.",
    };
  }

  const start = startsAt.getTime();
  const end = endsAt.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { ok: false, error: "Las fechas no son válidas." };
  }
  if (end <= start) {
    return { ok: false, error: "La fecha de fin tiene que ser posterior al inicio." };
  }
  if (end - start < MIN_DURATION_MS) {
    return { ok: false, error: "La oferta tiene que durar al menos 15 minutos." };
  }
  if (end - start > MAX_DURATION_DAYS * DAY_MS) {
    return {
      ok: false,
      error: `La oferta puede durar hasta ${MAX_DURATION_DAYS} días.`,
    };
  }
  if (end <= now) {
    return { ok: false, error: "La fecha de fin ya pasó." };
  }
  if (start > now + MAX_START_AHEAD_DAYS * DAY_MS) {
    return { ok: false, error: "La oferta puede programarse hasta con un año de anticipación." };
  }

  return { ok: true };
}

export function windowsOverlap(a: OfferWindow, b: OfferWindow): boolean {
  return time(a.startsAt) < time(b.endsAt) && time(b.startsAt) < time(a.endsAt);
}

type ExistingOffer = OfferWindow & {
  id: string;
  productId: string;
  enabled: boolean;
  featured: boolean;
};

/**
 * Conflictos con otras ofertas habilitadas (se ignora la propia al editar):
 * - dos ofertas del mismo producto que se superponen;
 * - dos ofertas destacadas en el banner que se superponen.
 * La base tiene las mismas reglas como restricciones de exclusión; esto
 * da un mensaje claro antes de llegar ahí.
 */
export function findOfferConflict(
  candidate: OfferWindow & { id?: string; productId: string; featured: boolean },
  existing: ExistingOffer[],
): string | null {
  const others = existing.filter(
    (offer) => offer.enabled && offer.id !== candidate.id && windowsOverlap(offer, candidate),
  );

  if (others.some((offer) => offer.productId === candidate.productId)) {
    return "Este producto ya tiene otra oferta habilitada en ese período.";
  }
  if (candidate.featured && others.some((offer) => offer.featured)) {
    return "Ya hay otra oferta destacada en el banner en ese período.";
  }
  return null;
}

/** La oferta destacada vigente, si hay (a lo sumo una por las reglas). */
export function pickFeaturedOffer<T extends OfferLike & { featured: boolean }>(
  offers: T[],
  now: number,
): T | null {
  return (
    offers
      .filter((offer) => offer.featured && offer.enabled && isWithinWindow(offer, now))
      .sort((a, b) => time(a.endsAt) - time(b.endsAt))[0] ?? null
  );
}

/** El vencimiento más próximo (ISO) entre varios, para refrescar a tiempo. */
export function earliestEnd(endsAt: (string | null | undefined)[]): string | null {
  const times = endsAt
    .filter((value): value is string => typeof value === "string")
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));
  return times.length > 0 ? new Date(Math.min(...times)).toISOString() : null;
}
