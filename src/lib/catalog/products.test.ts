import { afterEach, describe, expect, it, vi } from "vitest";
import { filterByCategory, toProductCards, toProductDetail } from "./products";
import { pickFeaturedOffer, type FeaturedOfferRow } from "@/lib/offers/queries";

const OFFER = {
  offer_price: 80,
  starts_at: "2026-10-01T00:00:00.000Z",
  ends_at: "2026-10-10T00:00:00.000Z",
  enabled: true,
};

const ACTIVE_OFFERS = new Map([
  [
    "p1",
    [{ offerPrice: 80, startsAt: OFFER.starts_at, endsAt: OFFER.ends_at, enabled: true }],
  ],
]);

function listRow(overrides: Partial<Parameters<typeof toProductCards>[0][number]> = {}) {
  return {
    id: "p1",
    category_id: "c1",
    name: "Anillo",
    slug: "anillo",
    price: 100,
    material: null,
    in_stock: true,
    product_image: [
      { url: "b.jpg", position: 2 },
      { url: "a.jpg", position: 1 },
    ],
    product_size: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("precio con las ofertas de la petición", () => {
  it("la oferta vigente se aplica con la hora del render", () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-05T00:00:00.000Z") });
    const [card] = toProductCards([listRow()], ACTIVE_OFFERS);
    expect(card).toMatchObject({
      price: 80,
      compareAtPrice: 100,
      offerEndsAt: "2026-10-10T00:00:00.000Z",
      mainImageUrl: "a.jpg",
    });
  });

  it("fuera del período no aplica aunque la oferta llegue en los datos", () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-10T00:00:00.000Z") });
    const [card] = toProductCards([listRow()], ACTIVE_OFFERS);
    expect(card).toMatchObject({ price: 100, compareAtPrice: null, offerEndsAt: null });
  });

  it("el banner destacado desaparece al vencer y no promociona productos sin stock", () => {
    const row: FeaturedOfferRow = {
      ...OFFER,
      product: {
        id: "p1",
        name: "Anillo",
        slug: "anillo",
        price: 100,
        in_stock: true,
        product_image: [],
        product_size: [],
      },
    };
    const during = Date.parse("2026-10-05T00:00:00.000Z");
    const after = Date.parse("2026-10-10T00:00:00.000Z");

    expect(pickFeaturedOffer([row], during)).toMatchObject({ price: 80, compareAtPrice: 100 });
    expect(pickFeaturedOffer([row], after)).toBeNull();
    expect(
      pickFeaturedOffer([{ ...row, product: { ...row.product, in_stock: false } }], during),
    ).toBeNull();
  });
});

describe("listados", () => {
  it("filtra por categoría manteniendo los sin stock al final", () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-05T00:00:00.000Z") });
    const cards = toProductCards([
      listRow({ id: "a", in_stock: false }),
      listRow({ id: "b" }),
      listRow({ id: "c", category_id: "c2" }),
      listRow({ id: "d", category_id: null }),
    ]);

    expect(cards.map((card) => card.id)).toEqual(["b", "c", "d", "a"]);
    expect(filterByCategory(cards, "c1").map((card) => card.id)).toEqual(["b", "a"]);
  });
});

describe("toProductDetail", () => {
  it("ordena imágenes y talles, oculta talles desactivados y calcula el stock", () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-05T00:00:00.000Z") });
    const detail = toProductDetail({
      id: "p1",
      name: "Anillo",
      slug: "anillo",
      description: null,
      price: 100,
      material: "Plata",
      in_stock: true,
      category: { name: "Anillos", slug: "anillos" },
      product_image: [
        { id: "i2", url: "b.jpg", position: 2 },
        { id: "i1", url: "a.jpg", position: 1 },
      ],
      product_size: [
        { id: "s2", label: "16", position: 2, available: true, in_stock: false },
        { id: "s1", label: "14", position: 1, available: false, in_stock: true },
      ],
    });

    expect(detail.images.map((image) => image.id)).toEqual(["i1", "i2"]);
    expect(detail.sizes).toEqual([{ id: "s2", label: "16", position: 2, inStock: false }]);
    expect(detail.inStock).toBe(false);
    expect(detail.category).toEqual({ name: "Anillos", slug: "anillos" });
  });
});
