import { describe, expect, it } from "vitest";
import { cartReducer, initialState } from "./cart-context";
import type { CartItem } from "./types";

/**
 * `cartReducer` e `initialState` se exportaron específicamente para este
 * archivo (ver cart-context.tsx) porque probar `CartProvider`/`useCart()`
 * de verdad requeriría montar el componente con jsdom + React Testing
 * Library — ninguna de las dos está instalada, y agregarlas sería meter
 * infraestructura nueva solo para testear. El reducer concentra toda la
 * lógica de negocio del carrito (identidad de líneas, clamping de
 * cantidades, alta/baja) de forma pura, así que probarlo directamente
 * cubre exactamente lo pedido sin necesitar un DOM.
 *
 * Lo que este archivo NO cubre (documentado, no evitado por descuido):
 * el wiring de los dos `useEffect` de CartProvider (que la lectura real
 * de localStorage ocurra recién después del mount, y que la escritura
 * a localStorage se posponga hasta isHydrated=true). Eso es
 * comportamiento de ciclo de vida de componente, no del reducer, y
 * requeriría esa misma infraestructura de montaje que se decidió no
 * agregar.
 */

function item(overrides: Partial<CartItem> = {}): CartItem {
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

describe("initialState / hidratación", () => {
  it("arranca vacío y sin hidratar (no depende de leer localStorage en el primer render)", () => {
    expect(initialState).toEqual({ items: [], isHydrated: false });
  });

  it("HYDRATE reemplaza los items y marca isHydrated en true", () => {
    const state = cartReducer(initialState, {
      type: "HYDRATE",
      items: [item({ productId: "p1" })],
    });
    expect(state.isHydrated).toBe(true);
    expect(state.items).toHaveLength(1);
  });

  it("HYDRATE con carrito vacío guardado deja items en [] pero isHydrated en true", () => {
    const state = cartReducer(initialState, { type: "HYDRATE", items: [] });
    expect(state).toEqual({ items: [], isHydrated: true });
  });
});

describe("cartReducer - ADD_ITEM", () => {
  it("agrega un producto nuevo", () => {
    const state = cartReducer(initialState, { type: "ADD_ITEM", item: item() });
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ productId: "p1", quantity: 1 });
  });

  it("agregar el mismo producto sin talle de nuevo incrementa la cantidad en la misma línea", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ quantity: 2 }),
    });
    state = cartReducer(state, { type: "ADD_ITEM", item: item({ quantity: 3 }) });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(5);
  });

  it("agregar el mismo producto con el mismo talle incrementa la cantidad en la misma línea", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s16", sizeLabel: "16", quantity: 1 }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s16", sizeLabel: "16", quantity: 2 }),
    });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it("agregar el mismo producto con otro talle crea una línea separada", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s16", sizeLabel: "16" }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s18", sizeLabel: "18" }),
    });
    expect(state.items).toHaveLength(2);
  });

  it("producto con talle y el mismo producto sin talle son líneas distintas", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s16", sizeLabel: "16" }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ sizeId: null, sizeLabel: null }),
    });
    expect(state.items).toHaveLength(2);
  });

  it("agregar varios productos distintos mantiene todas las líneas", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    state = cartReducer(state, { type: "ADD_ITEM", item: item({ productId: "p2" }) });
    state = cartReducer(state, { type: "ADD_ITEM", item: item({ productId: "p3" }) });
    expect(state.items).toHaveLength(3);
  });

  it("clampea la cantidad a 99 como máximo al agregar", () => {
    const state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ quantity: 500 }),
    });
    expect(state.items[0].quantity).toBe(99);
  });

  it("clampea la cantidad a 1 como mínimo al agregar (0 no elimina, ADD_ITEM siempre clampea)", () => {
    const state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ quantity: 0 }),
    });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(1);
  });
});

describe("cartReducer - UPDATE_QUANTITY", () => {
  function withOneItem(quantity = 5): ReturnType<typeof cartReducer> {
    return cartReducer(initialState, { type: "ADD_ITEM", item: item({ quantity }) });
  }

  it("incrementa la cantidad de una línea existente", () => {
    const state = cartReducer(withOneItem(1), {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: 2,
    });
    expect(state.items[0].quantity).toBe(2);
  });

  it("disminuye la cantidad de una línea existente", () => {
    const state = cartReducer(withOneItem(5), {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: 3,
    });
    expect(state.items[0].quantity).toBe(3);
  });

  it("no permite superar la cantidad máxima (99)", () => {
    const state = cartReducer(withOneItem(1), {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: 200,
    });
    expect(state.items[0].quantity).toBe(99);
  });

  it("cantidad 0 elimina la línea", () => {
    const state = cartReducer(withOneItem(1), {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: 0,
    });
    expect(state.items).toHaveLength(0);
  });

  it("cantidad negativa elimina la línea (misma lógica que 0)", () => {
    const state = cartReducer(withOneItem(1), {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: -3,
    });
    expect(state.items).toHaveLength(0);
  });

  it("actualizar una línea no afecta a las demás", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ productId: "p2", quantity: 4 }),
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: null,
      quantity: 9,
    });
    const p2 = state.items.find((line) => line.productId === "p2");
    expect(p2?.quantity).toBe(4);
  });

  it("actualizar la cantidad de un talle específico no afecta al mismo producto en otro talle", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s16", sizeLabel: "16", quantity: 2 }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ sizeId: "s18", sizeLabel: "18", quantity: 1 }),
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      productId: "p1",
      sizeId: "s16",
      quantity: 5,
    });
    const size16 = state.items.find((line) => line.sizeId === "s16");
    const size18 = state.items.find((line) => line.sizeId === "s18");
    expect(size16?.quantity).toBe(5);
    expect(size18?.quantity).toBe(1);
  });
});

describe("cartReducer - REMOVE_ITEM", () => {
  it("elimina una línea existente", () => {
    const withItem = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    const state = cartReducer(withItem, {
      type: "REMOVE_ITEM",
      productId: "p1",
      sizeId: null,
    });
    expect(state.items).toHaveLength(0);
  });

  it("eliminar una línea inexistente no rompe el estado", () => {
    const base = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    const state = cartReducer(base, {
      type: "REMOVE_ITEM",
      productId: "no-existe",
      sizeId: null,
    });
    expect(state.items).toEqual(base.items);
  });

  it("eliminar una línea no afecta a las demás", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    state = cartReducer(state, { type: "ADD_ITEM", item: item({ productId: "p2" }) });
    state = cartReducer(state, { type: "REMOVE_ITEM", productId: "p1", sizeId: null });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe("p2");
  });
});

describe("cartReducer - CLEAR_CART", () => {
  it("vacía todas las líneas", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1" }),
    });
    state = cartReducer(state, { type: "ADD_ITEM", item: item({ productId: "p2" }) });
    state = cartReducer(state, { type: "CLEAR_CART" });
    expect(state.items).toEqual([]);
  });
});

describe("cálculos derivados (itemCount / subtotal) a partir del estado del reducer", () => {
  // itemCount y subtotal se calculan en CartProvider con useMemo sobre
  // `items`; acá se reproduce la misma fórmula (suma de quantity, y suma
  // de unitPrice×quantity) sobre el resultado real del reducer, sin
  // importar ninguna función de CartProvider (no está exportada y no
  // hace falta: son fórmulas de una línea, documentadas en el propio
  // enunciado de esta etapa).
  it("itemCount representa unidades totales, no cantidad de líneas", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1", quantity: 2 }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ productId: "p2", quantity: 3 }),
    });
    const itemCount = state.items.reduce((total, line) => total + line.quantity, 0);

    expect(state.items).toHaveLength(2); // 2 líneas
    expect(itemCount).toBe(5); // 5 unidades
  });

  it("subtotal es la suma de precio unitario × cantidad de cada línea", () => {
    let state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ productId: "p1", unitPrice: 100, quantity: 2 }),
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      item: item({ productId: "p2", unitPrice: 50, quantity: 3 }),
    });
    const subtotal = state.items.reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    );

    expect(subtotal).toBe(350);
  });

  it("calcula el subtotal correctamente con precios decimales", () => {
    const state = cartReducer(initialState, {
      type: "ADD_ITEM",
      item: item({ unitPrice: 1500.5, quantity: 3 }),
    });
    const subtotal = state.items.reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    );

    expect(subtotal).toBeCloseTo(4501.5, 2);
  });

  it("itemCount y subtotal en 0 cuando el carrito está vacío", () => {
    const itemCount = initialState.items.reduce((total, line) => total + line.quantity, 0);
    const subtotal = initialState.items.reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    );
    expect(itemCount).toBe(0);
    expect(subtotal).toBe(0);
  });
});
