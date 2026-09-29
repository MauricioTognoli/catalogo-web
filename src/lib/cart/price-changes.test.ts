import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/utils/formatPrice";
import { describePriceChange, diffCartPrices } from "./price-changes";
import type { CartItem } from "./types";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    productSlug: "anillo",
    productName: "Anillo",
    productImageUrl: null,
    unitPrice: 800,
    listPrice: 1000,
    quantity: 1,
    sizeId: null,
    sizeLabel: null,
    ...overrides,
  };
}

describe("diffCartPrices", () => {
  it("sin cambios no informa nada", () => {
    expect(
      diffCartPrices([item()], [
        { productId: "p1", sizeId: null, unitPrice: 800, listPrice: 1000 },
      ]),
    ).toEqual([]);
  });

  it("detecta el vencimiento de la oferta", () => {
    const [change] = diffCartPrices([item()], [
      { productId: "p1", sizeId: null, unitPrice: 1000, listPrice: null },
    ]);
    expect(change).toMatchObject({
      reason: "offer_ended",
      previousUnitPrice: 800,
      unitPrice: 1000,
    });
    expect(describePriceChange(change)).toBe(
      `Terminó la oferta de Anillo: el precio pasó de ${formatPrice(800)} a ${formatPrice(1000)}.`,
    );
  });

  it("detecta una oferta que empezó después de agregar", () => {
    const [change] = diffCartPrices([item({ unitPrice: 1000, listPrice: null })], [
      { productId: "p1", sizeId: null, unitPrice: 800, listPrice: 1000 },
    ]);
    expect(change.reason).toBe("offer_started");
  });

  it("detecta un cambio del precio normal", () => {
    const [change] = diffCartPrices([item({ unitPrice: 1000, listPrice: null })], [
      { productId: "p1", sizeId: null, unitPrice: 1200, listPrice: null },
    ]);
    expect(change.reason).toBe("price_changed");
  });

  it("compara por producto y talle, e ignora líneas sin dato", () => {
    const changes = diffCartPrices(
      [item({ sizeId: "s1" }), item({ sizeId: "s2" }), item({ productId: "p2" })],
      [
        { productId: "p1", sizeId: "s1", unitPrice: 800, listPrice: 1000 },
        { productId: "p1", sizeId: "s2", unitPrice: 1000, listPrice: null },
      ],
    );
    expect(changes.map((change) => change.sizeId)).toEqual(["s2"]);
  });
});
