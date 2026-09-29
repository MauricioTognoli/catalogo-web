import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_DAYS,
  MAX_START_AHEAD_DAYS,
  discountPercent,
  earliestEnd,
  effectivePrice,
  findOfferConflict,
  offerStatus,
  pickFeaturedOffer,
  validateOffer,
  windowsOverlap,
} from "./pricing";

const START = "2026-10-01T13:00:00.000Z";
const END = "2026-10-03T23:00:00.000Z";
const start = Date.parse(START);
const end = Date.parse(END);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const offer = { startsAt: START, endsAt: END, enabled: true, offerPrice: 800 };

describe("offerStatus: inicio y fin exactos", () => {
  it("programada antes del inicio", () => {
    expect(offerStatus(offer, start - 1)).toBe("scheduled");
  });

  it("activa exactamente en el inicio", () => {
    expect(offerStatus(offer, start)).toBe("active");
  });

  it("activa un milisegundo antes del fin", () => {
    expect(offerStatus(offer, end - 1)).toBe("active");
  });

  it("finalizada exactamente en el fin", () => {
    expect(offerStatus(offer, end)).toBe("ended");
  });

  it("desactivada no se aplica aunque esté en período; vencida sigue 'finalizada'", () => {
    expect(offerStatus({ ...offer, enabled: false }, start)).toBe("disabled");
    expect(offerStatus({ ...offer, enabled: false }, end)).toBe("ended");
  });
});

describe("effectivePrice", () => {
  it("durante la oferta: precio promocional, precio anterior y fin real", () => {
    expect(effectivePrice(1000, [offer], start)).toEqual({
      price: 800,
      compareAtPrice: 1000,
      offerEndsAt: END,
    });
  });

  it("antes y después del período vuelve el precio normal", () => {
    const normal = { price: 1000, compareAtPrice: null, offerEndsAt: null };
    expect(effectivePrice(1000, [offer], start - 1)).toEqual(normal);
    expect(effectivePrice(1000, [offer], end)).toEqual(normal);
  });

  it("ignora ofertas desactivadas", () => {
    expect(effectivePrice(1000, [{ ...offer, enabled: false }], start).price).toBe(1000);
  });

  it("ignora la oferta si el precio normal bajó por debajo del promocional", () => {
    expect(effectivePrice(700, [offer], start)).toEqual({
      price: 700,
      compareAtPrice: null,
      offerEndsAt: null,
    });
    expect(effectivePrice(800, [offer], start).price).toBe(800);
  });

  it("sin ofertas, precio normal", () => {
    expect(effectivePrice(1000, [], start).compareAtPrice).toBeNull();
  });
});

describe("validateOffer: precio y límites de fechas", () => {
  const now = start - DAY;
  const base = {
    offerPrice: 800,
    regularPrice: 1000,
    startsAt: new Date(START),
    endsAt: new Date(END),
    now,
  };

  it("acepta una oferta válida", () => {
    expect(validateOffer(base)).toEqual({ ok: true });
  });

  it("rechaza precio promocional igual o mayor al normal, o no positivo", () => {
    expect(validateOffer({ ...base, offerPrice: 1000 }).ok).toBe(false);
    expect(validateOffer({ ...base, offerPrice: 1200 }).ok).toBe(false);
    expect(validateOffer({ ...base, offerPrice: 0 }).ok).toBe(false);
    expect(validateOffer({ ...base, offerPrice: Number.NaN }).ok).toBe(false);
  });

  it("rechaza fin igual o anterior al inicio", () => {
    expect(validateOffer({ ...base, endsAt: new Date(START) }).ok).toBe(false);
    expect(validateOffer({ ...base, endsAt: new Date(start - MINUTE) }).ok).toBe(false);
  });

  it("exige al menos 15 minutos de duración", () => {
    expect(validateOffer({ ...base, endsAt: new Date(start + 14 * MINUTE) }).ok).toBe(false);
    expect(validateOffer({ ...base, endsAt: new Date(start + 15 * MINUTE) }).ok).toBe(true);
  });

  it(`permite hasta ${MAX_DURATION_DAYS} días de duración`, () => {
    expect(
      validateOffer({ ...base, endsAt: new Date(start + MAX_DURATION_DAYS * DAY) }).ok,
    ).toBe(true);
    expect(
      validateOffer({ ...base, endsAt: new Date(start + MAX_DURATION_DAYS * DAY + 1) }).ok,
    ).toBe(false);
  });

  it("no guarda una oferta cuyo fin ya pasó", () => {
    expect(validateOffer({ ...base, now: end }).ok).toBe(false);
    expect(validateOffer({ ...base, now: end - 1 }).ok).toBe(true);
  });

  it("permite un inicio en el pasado (oferta que ya arrancó)", () => {
    expect(validateOffer({ ...base, now: start + DAY }).ok).toBe(true);
  });

  it(`no permite programar a más de ${MAX_START_AHEAD_DAYS} días`, () => {
    const far = now + MAX_START_AHEAD_DAYS * DAY;
    expect(
      validateOffer({ ...base, startsAt: new Date(far), endsAt: new Date(far + DAY) }).ok,
    ).toBe(true);
    expect(
      validateOffer({
        ...base,
        startsAt: new Date(far + 1),
        endsAt: new Date(far + 1 + DAY),
      }).ok,
    ).toBe(false);
  });
});

describe("conflictos entre ofertas", () => {
  const existing = {
    id: "o1",
    productId: "p1",
    startsAt: START,
    endsAt: END,
    enabled: true,
    featured: false,
  };

  it("los períodos contiguos no se superponen ([inicio, fin))", () => {
    expect(windowsOverlap(existing, { startsAt: END, endsAt: "2026-10-05T00:00:00Z" })).toBe(
      false,
    );
    expect(
      windowsOverlap(existing, { startsAt: "2026-10-03T22:59:00Z", endsAt: "2026-10-05T00:00:00Z" }),
    ).toBe(true);
  });

  it("rechaza dos ofertas habilitadas superpuestas en el mismo producto", () => {
    expect(
      findOfferConflict(
        { productId: "p1", startsAt: "2026-10-02T00:00:00Z", endsAt: "2026-10-04T00:00:00Z", featured: false },
        [existing],
      ),
    ).toMatch(/otra oferta/);
  });

  it("permite superponer si la otra está desactivada, es otro producto o es la misma", () => {
    const candidate = {
      productId: "p1",
      startsAt: START,
      endsAt: END,
      featured: false,
    };
    expect(findOfferConflict(candidate, [{ ...existing, enabled: false }])).toBeNull();
    expect(findOfferConflict({ ...candidate, productId: "p2" }, [existing])).toBeNull();
    expect(findOfferConflict({ ...candidate, id: "o1" }, [existing])).toBeNull();
  });

  it("solo una oferta destacada en el banner a la vez", () => {
    const featured = { ...existing, productId: "p9", featured: true };
    expect(
      findOfferConflict({ productId: "p2", startsAt: START, endsAt: END, featured: true }, [
        featured,
      ]),
    ).toMatch(/destacada/);
    expect(
      findOfferConflict({ productId: "p2", startsAt: START, endsAt: END, featured: false }, [
        featured,
      ]),
    ).toBeNull();
  });
});

describe("destacada y vencimientos", () => {
  it("elige la destacada vigente e ignora las vencidas o no destacadas", () => {
    const featured = { ...offer, featured: true };
    expect(pickFeaturedOffer([featured, { ...offer, featured: false }], start)).toBe(featured);
    expect(pickFeaturedOffer([featured], end)).toBeNull();
    expect(pickFeaturedOffer([{ ...offer, featured: false }], start)).toBeNull();
  });

  it("calcula el vencimiento más próximo", () => {
    expect(earliestEnd([END, null, START])).toBe(START);
    expect(earliestEnd([null, undefined])).toBeNull();
  });

  it("porcentaje de descuento redondeado hacia abajo", () => {
    expect(discountPercent(1000, 800)).toBe(20);
    expect(discountPercent(3000, 1999)).toBe(33);
    expect(discountPercent(1000, 1000)).toBe(0);
  });
});
