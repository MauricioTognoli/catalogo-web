import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY, readCartFromStorage, writeCartToStorage } from "./storage";
import type { CartItem } from "./types";

/**
 * El entorno de test corre en Node ("environment: node" en
 * vitest.config.mts), donde no existe `window`. readCartFromStorage /
 * writeCartToStorage ya manejan ese caso (devuelven [] / no-op), así que
 * para poder probar la lógica de parseo real necesitamos un
 * `window.localStorage` de mentira. Se arma acá mismo con
 * `vi.stubGlobal`, sin agregar jsdom ni ninguna dependencia nueva.
 */
class FakeLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function validItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    productSlug: "producto",
    productName: "Producto",
    productImageUrl: null,
    unitPrice: 1000,
    quantity: 1,
    sizeId: null,
    sizeLabel: null,
    ...overrides,
  };
}

let fakeStorage: FakeLocalStorage;

beforeEach(() => {
  fakeStorage = new FakeLocalStorage();
  vi.stubGlobal("window", { localStorage: fakeStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readCartFromStorage", () => {
  it("devuelve un carrito vacío cuando no hay nada guardado", () => {
    expect(readCartFromStorage()).toEqual([]);
  });

  it("recupera exactamente lo que se guardó con writeCartToStorage", () => {
    const items = [
      validItem({ productId: "p1" }),
      validItem({ productId: "p2", sizeId: "s1", sizeLabel: "M" }),
    ];
    writeCartToStorage(items);
    expect(readCartFromStorage()).toEqual(items);
  });

  it("guarda y recupera un carrito vacío explícitamente", () => {
    writeCartToStorage([]);
    expect(readCartFromStorage()).toEqual([]);
  });

  it("guarda bajo la clave CART_STORAGE_KEY", () => {
    writeCartToStorage([validItem()]);
    expect(fakeStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();
  });

  it("JSON inválido produce carrito vacío y limpia la entrada corrupta", () => {
    fakeStorage.setItem(CART_STORAGE_KEY, "{esto no es json");
    expect(readCartFromStorage()).toEqual([]);
    expect(fakeStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it("JSON válido pero que no es un array produce carrito vacío y limpia la entrada", () => {
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(readCartFromStorage()).toEqual([]);
    expect(fakeStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it("descarta elementos del array que no son objetos", () => {
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(["texto", 42, null, true]));
    expect(readCartFromStorage()).toEqual([]);
  });

  it("descarta items con campos obligatorios faltantes o vacíos", () => {
    const raw = [
      { productSlug: "a", productName: "A", unitPrice: 100, quantity: 1 }, // sin productId
      { productId: "", productSlug: "b", productName: "B", unitPrice: 100, quantity: 1 }, // productId vacío
      { productId: "p1", productSlug: "", productName: "C", unitPrice: 100, quantity: 1 }, // productSlug vacío
      { productId: "p2", productSlug: "d", productName: "", unitPrice: 100, quantity: 1 }, // productName vacío
      { productId: "p3", productSlug: "e", productName: "E", unitPrice: 100, quantity: 1 }, // válido
    ];
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(raw));
    const result = readCartFromStorage();
    expect(result.map((item) => item.productId)).toEqual(["p3"]);
  });

  it("descarta items con precio inválido (negativo, no numérico o infinito)", () => {
    const raw = [
      { productId: "p1", productSlug: "a", productName: "A", unitPrice: -50, quantity: 1 },
      { productId: "p2", productSlug: "b", productName: "B", unitPrice: "100", quantity: 1 },
      {
        productId: "p3",
        productSlug: "c",
        productName: "C",
        unitPrice: Number.POSITIVE_INFINITY,
        quantity: 1,
      },
    ];
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(raw));
    expect(readCartFromStorage()).toEqual([]);
  });

  it("descarta items con cantidades inválidas (0, negativa, decimal, >99, NaN o string)", () => {
    const raw = [
      { productId: "p1", productSlug: "a", productName: "A", unitPrice: 100, quantity: 0 },
      { productId: "p2", productSlug: "b", productName: "B", unitPrice: 100, quantity: -1 },
      { productId: "p3", productSlug: "c", productName: "C", unitPrice: 100, quantity: 1.5 },
      { productId: "p4", productSlug: "d", productName: "D", unitPrice: 100, quantity: 100 },
      { productId: "p5", productSlug: "e", productName: "E", unitPrice: 100, quantity: Number.NaN },
      { productId: "p6", productSlug: "f", productName: "F", unitPrice: 100, quantity: "3" },
    ];
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(raw));
    expect(readCartFromStorage()).toEqual([]);
  });

  it("conserva items válidos en los límites exactos de cantidad (1 y 99)", () => {
    const raw = [
      { productId: "p1", productSlug: "a", productName: "A", unitPrice: 100, quantity: 1 },
      { productId: "p2", productSlug: "b", productName: "B", unitPrice: 100, quantity: 99 },
    ];
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(raw));
    expect(readCartFromStorage()).toHaveLength(2);
  });

  it("completa productImageUrl, sizeId y sizeLabel como null cuando faltan en el JSON", () => {
    fakeStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "p1", productSlug: "a", productName: "A", unitPrice: 100, quantity: 1 },
      ]),
    );
    const [item] = readCartFromStorage();
    expect(item.productImageUrl).toBeNull();
    expect(item.sizeId).toBeNull();
    expect(item.sizeLabel).toBeNull();
  });

  it("en un array con datos corruptos mezclados, filtra los inválidos y conserva los válidos", () => {
    const raw = [
      { productId: "ok1", productSlug: "a", productName: "A", unitPrice: 100, quantity: 2 },
      { productId: "", productSlug: "b", productName: "B", unitPrice: 100, quantity: 1 },
      {
        productId: "ok2",
        productSlug: "c",
        productName: "C",
        unitPrice: 250.5,
        quantity: 3,
        sizeId: "s1",
        sizeLabel: "M",
      },
      "no es un objeto",
      null,
      undefined,
    ];
    fakeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(raw));
    const result = readCartFromStorage();
    expect(result.map((item) => item.productId)).toEqual(["ok1", "ok2"]);
  });
});

describe("writeCartToStorage", () => {
  it("no lanza si localStorage.setItem falla (ej. cuota excedida)", () => {
    fakeStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => writeCartToStorage([validItem()])).not.toThrow();
  });
});
