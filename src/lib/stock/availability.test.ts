import { describe, expect, it } from "vitest";
import {
  LOW_STOCK_THRESHOLD,
  MAX_STOCK,
  isBlockingStatus,
  isProductPurchasable,
  isPublicProductPurchasable,
  isSizePurchasable,
  parseStockInput,
  resolveCartLineStatus,
  summarizeStock,
  type CartLineFacts,
} from "./availability";

describe("isSizePurchasable", () => {
  it("requiere talle activo y con unidades", () => {
    expect(isSizePurchasable({ available: true, stock: 3 })).toBe(true);
    expect(isSizePurchasable({ available: true, stock: 0 })).toBe(false);
    expect(isSizePurchasable({ available: false, stock: 3 })).toBe(false);
  });

  it("trata el stock sin cargar (null) como disponible", () => {
    expect(isSizePurchasable({ available: true, stock: null })).toBe(true);
  });
});

describe("isProductPurchasable", () => {
  describe("sin talles: manda el stock del producto", () => {
    it("con unidades", () => {
      expect(isProductPurchasable({ stock: 1, sizes: [] })).toBe(true);
    });

    it("con cero unidades", () => {
      expect(isProductPurchasable({ stock: 0, sizes: [] })).toBe(false);
    });

    it("sin cargar (migración) sigue vendible", () => {
      expect(isProductPurchasable({ stock: null, sizes: [] })).toBe(true);
    });
  });

  describe("con talles: manda el stock de los talles", () => {
    it("ignora el stock del producto", () => {
      expect(
        isProductPurchasable({ stock: 0, sizes: [{ available: true, stock: 2 }] }),
      ).toBe(true);
      expect(
        isProductPurchasable({ stock: 10, sizes: [{ available: true, stock: 0 }] }),
      ).toBe(false);
    });

    it("alcanza con un talle comprable", () => {
      expect(
        isProductPurchasable({
          stock: null,
          sizes: [
            { available: true, stock: 0 },
            { available: true, stock: 1 },
          ],
        }),
      ).toBe(true);
    });

    it("con todos los talles desactivados no se vende sin talle", () => {
      expect(
        isProductPurchasable({
          stock: null,
          sizes: [{ available: false, stock: 5 }],
        }),
      ).toBe(false);
    });
  });
});

describe("isPublicProductPurchasable", () => {
  it("sin talles usa in_stock del producto", () => {
    expect(isPublicProductPurchasable({ inStock: true, sizes: [] })).toBe(true);
    expect(isPublicProductPurchasable({ inStock: false, sizes: [] })).toBe(false);
  });

  it("con talles requiere un talle activo con stock", () => {
    expect(
      isPublicProductPurchasable({
        inStock: false,
        sizes: [{ available: true, inStock: true }],
      }),
    ).toBe(true);
    expect(
      isPublicProductPurchasable({
        inStock: true,
        sizes: [
          { available: true, inStock: false },
          { available: false, inStock: true },
        ],
      }),
    ).toBe(false);
  });
});

describe("summarizeStock", () => {
  it("producto sin talles", () => {
    expect(summarizeStock({ stock: 10, sizes: [] })).toEqual({
      state: "ok",
      units: 10,
      purchasable: true,
      managedBySize: false,
    });
    expect(summarizeStock({ stock: LOW_STOCK_THRESHOLD, sizes: [] }).state).toBe("low");
    expect(summarizeStock({ stock: 0, sizes: [] }).state).toBe("out");
    expect(summarizeStock({ stock: null, sizes: [] }).state).toBe("untracked");
  });

  it("producto con talles suma solo los talles activos", () => {
    const summary = summarizeStock({
      stock: 50,
      sizes: [
        { available: true, stock: 2 },
        { available: true, stock: 3 },
        { available: false, stock: 100 },
      ],
    });
    expect(summary).toEqual({
      state: "ok",
      units: 5,
      purchasable: true,
      managedBySize: true,
    });
  });

  it("con talles: sin stock si ningún talle es comprable", () => {
    expect(
      summarizeStock({ stock: 50, sizes: [{ available: true, stock: 0 }] }).state,
    ).toBe("out");
  });

  it("con talles: 'sin cargar' si algún talle activo no tiene cantidad", () => {
    expect(
      summarizeStock({
        stock: null,
        sizes: [
          { available: true, stock: 4 },
          { available: true, stock: null },
        ],
      }).state,
    ).toBe("untracked");
  });
});

describe("parseStockInput", () => {
  it("acepta enteros entre 0 y el máximo", () => {
    expect(parseStockInput("0")).toEqual({ ok: true, value: 0 });
    expect(parseStockInput(" 12 ")).toEqual({ ok: true, value: 12 });
    expect(parseStockInput(String(MAX_STOCK))).toEqual({ ok: true, value: MAX_STOCK });
  });

  it("rechaza vacío, negativos, decimales y texto", () => {
    for (const raw of ["", null, "-1", "1.5", "abc", String(MAX_STOCK + 1)]) {
      expect(parseStockInput(raw).ok).toBe(false);
    }
  });
});

describe("resolveCartLineStatus", () => {
  const ok: CartLineFacts = {
    productAvailable: true,
    hasSizes: false,
    sizeAvailable: null,
    inStock: true,
    coversQuantity: true,
  };
  const withSize: CartLineFacts = { ...ok, hasSizes: true, sizeAvailable: true };

  it("línea sin talle en producto sin talles", () => {
    expect(resolveCartLineStatus(null, ok)).toBe("ok");
    expect(resolveCartLineStatus(null, { ...ok, inStock: false, coversQuantity: false })).toBe(
      "out_of_stock",
    );
    expect(resolveCartLineStatus(null, { ...ok, coversQuantity: false })).toBe(
      "insufficient",
    );
  });

  it("línea con talle", () => {
    expect(resolveCartLineStatus("s1", withSize)).toBe("ok");
    expect(resolveCartLineStatus("s1", { ...withSize, inStock: false })).toBe(
      "out_of_stock",
    );
    expect(resolveCartLineStatus("s1", { ...withSize, sizeAvailable: false })).toBe(
      "unavailable",
    );
  });

  it("producto que pasó a tener talles exige elegir uno", () => {
    expect(resolveCartLineStatus(null, withSize)).toBe("needs_size");
  });

  it("talle que ya no existe porque el producto quedó sin talles", () => {
    expect(resolveCartLineStatus("s1", { ...ok, sizeAvailable: false })).toBe(
      "unavailable",
    );
  });

  it("producto oculto, eliminado o sin datos", () => {
    expect(resolveCartLineStatus(null, { ...ok, productAvailable: false })).toBe(
      "unavailable",
    );
    expect(resolveCartLineStatus(null, undefined)).toBe("unavailable");
  });

  it("solo 'insufficient' permite enviar el pedido", () => {
    expect(isBlockingStatus("ok")).toBe(false);
    expect(isBlockingStatus("insufficient")).toBe(false);
    expect(isBlockingStatus("out_of_stock")).toBe(true);
    expect(isBlockingStatus("needs_size")).toBe(true);
    expect(isBlockingStatus("unavailable")).toBe(true);
  });
});
