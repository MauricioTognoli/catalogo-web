import { describe, expect, it } from "vitest";
import { isSameCartLine } from "./types";

describe("isSameCartLine", () => {
  it("es true para mismo productId y mismo sizeId", () => {
    expect(
      isSameCartLine({ productId: "p1", sizeId: "s1" }, { productId: "p1", sizeId: "s1" }),
    ).toBe(true);
  });

  it("es false para mismo productId y distinto sizeId", () => {
    expect(
      isSameCartLine({ productId: "p1", sizeId: "s1" }, { productId: "p1", sizeId: "s2" }),
    ).toBe(false);
  });

  it("es true para el mismo producto sin talle (sizeId null en ambos)", () => {
    expect(
      isSameCartLine({ productId: "p1", sizeId: null }, { productId: "p1", sizeId: null }),
    ).toBe(true);
  });

  it("es false entre un producto con talle y el mismo producto sin talle", () => {
    expect(
      isSameCartLine({ productId: "p1", sizeId: "s1" }, { productId: "p1", sizeId: null }),
    ).toBe(false);
  });

  it("es false para distinto productId, aunque el sizeId coincida", () => {
    expect(
      isSameCartLine({ productId: "p1", sizeId: "s1" }, { productId: "p2", sizeId: "s1" }),
    ).toBe(false);
  });
});
