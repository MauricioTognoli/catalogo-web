/**
 * Reglas de stock y disponibilidad. Funciones puras, compartidas por el
 * panel, la tienda y la revalidación del carrito.
 *
 * - `stock: null` = "sin cargar" (productos/talles anteriores a la gestión
 *   de stock). Se trata como disponible para no ocultar nada de golpe;
 *   ver supabase/migrations/20260929120000_add_stock.sql.
 * - Producto CON talles: manda el stock de cada talle; el del producto se
 *   ignora. Producto SIN talles: manda el del producto.
 */

/** Hasta cuántas unidades se considera "stock bajo" en el panel. */
export const LOW_STOCK_THRESHOLD = 2;

/** Tope de carga manual, para cortar errores de tipeo (ej: 10000 por 100). */
export const MAX_STOCK = 99999;

export function hasUnits(stock: number | null): boolean {
  return stock === null || stock > 0;
}

type SizeStock = { available: boolean; stock: number | null };

/** Un talle se puede elegir si está activo y le quedan unidades. */
export function isSizePurchasable(size: SizeStock): boolean {
  return size.available && hasUnits(size.stock);
}

/**
 * ¿Se puede agregar al carrito? `sizes` son TODOS los talles del producto,
 * activos o no: un producto con talles pero ninguno comprable está sin
 * stock (no se vende "sin talle").
 */
export function isProductPurchasable(product: {
  stock: number | null;
  sizes: SizeStock[];
}): boolean {
  if (product.sizes.length > 0) {
    return product.sizes.some(isSizePurchasable);
  }
  return hasUnits(product.stock);
}

/** Variante para la tienda, que recibe `in_stock` en lugar de cantidades. */
export function isPublicProductPurchasable(product: {
  inStock: boolean;
  sizes: { available: boolean; inStock: boolean }[];
}): boolean {
  if (product.sizes.length > 0) {
    return product.sizes.some((size) => size.available && size.inStock);
  }
  return product.inStock;
}

/** Los productos sin stock al final, sin alterar el orden dentro de cada grupo. */
export function inStockFirst<T extends { inStock: boolean }>(products: T[]): T[] {
  return [
    ...products.filter((product) => product.inStock),
    ...products.filter((product) => !product.inStock),
  ];
}

export type StockState = "ok" | "low" | "out" | "untracked";

export type StockSummary = {
  state: StockState;
  /** Unidades vendibles conocidas (suma de talles activos, o del producto). */
  units: number;
  purchasable: boolean;
  managedBySize: boolean;
};

/** Resumen para el panel: tabla, ficha y avisos del dashboard. */
export function summarizeStock(product: {
  stock: number | null;
  sizes: SizeStock[];
}): StockSummary {
  const managedBySize = product.sizes.length > 0;
  const purchasable = isProductPurchasable(product);

  const relevant = managedBySize
    ? product.sizes.filter((size) => size.available).map((size) => size.stock)
    : [product.stock];
  const units = relevant.reduce<number>((total, stock) => total + (stock ?? 0), 0);
  const untracked = relevant.some((stock) => stock === null);

  let state: StockState;
  if (!purchasable) state = "out";
  else if (untracked) state = "untracked";
  else if (units <= LOW_STOCK_THRESHOLD) state = "low";
  else state = "ok";

  return { state, units, purchasable, managedBySize };
}

/**
 * Valida una cantidad cargada en un formulario. Devuelve el entero o un
 * mensaje de error. Vacío no se acepta: el stock siempre se carga
 * explícitamente (NULL solo existe por la migración).
 */
export function parseStockInput(
  raw: FormDataEntryValue | null,
): { ok: true; value: number } | { ok: false; error: string } {
  const text = String(raw ?? "").trim();
  const value = Number(text);

  if (text === "" || !Number.isInteger(value) || value < 0 || value > MAX_STOCK) {
    return {
      ok: false,
      error: `El stock debe ser un número entero entre 0 y ${MAX_STOCK}.`,
    };
  }

  return { ok: true, value };
}

// ---------------------------------------------------------------------
// Carrito
// ---------------------------------------------------------------------

/** Hechos que devuelve la función SQL cart_stock_status por línea. */
export type CartLineFacts = {
  productAvailable: boolean;
  hasSizes: boolean;
  /** null si la línea no tiene talle. */
  sizeAvailable: boolean | null;
  inStock: boolean;
  coversQuantity: boolean;
};

export type CartLineStatus =
  | "ok"
  /** Pidió más unidades de las disponibles (sin revelar cuántas hay). */
  | "insufficient"
  | "out_of_stock"
  /** El producto ahora tiene talles y la línea no tiene uno elegido. */
  | "needs_size"
  /** Producto oculto/eliminado, o talle eliminado/desactivado. */
  | "unavailable";

export function resolveCartLineStatus(
  sizeId: string | null,
  facts: CartLineFacts | undefined,
): CartLineStatus {
  if (!facts || !facts.productAvailable) return "unavailable";
  if (sizeId === null && facts.hasSizes) return "needs_size";
  if (sizeId !== null && !facts.sizeAvailable) return "unavailable";
  if (!facts.inStock) return "out_of_stock";
  if (!facts.coversQuantity) return "insufficient";
  return "ok";
}

/** Estados que impiden enviar el pedido hasta quitar la línea. */
export function isBlockingStatus(status: CartLineStatus): boolean {
  return (
    status === "out_of_stock" ||
    status === "unavailable" ||
    status === "needs_size"
  );
}
