import { MAX_QUANTITY, MIN_QUANTITY, type CartItem } from "./types";

export const CART_STORAGE_KEY = "catalogo-web-cart";

function parseCartItem(value: unknown): CartItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item = value as Record<string, unknown>;

  const productId = item.productId;
  const productSlug = item.productSlug;
  const productName = item.productName;
  const unitPrice = item.unitPrice;
  const quantity = item.quantity;

  if (
    typeof productId !== "string" ||
    productId === "" ||
    typeof productSlug !== "string" ||
    productSlug === "" ||
    typeof productName !== "string" ||
    productName === "" ||
    typeof unitPrice !== "number" ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    return null;
  }

  // Una cantidad inválida (no entera, <=0, NaN/Infinity, etc.) hace que
  // se descarte el item completo en vez de "corregirlo": un valor así
  // solo puede venir de datos corruptos, nunca de una acción legítima
  // del carrito (esas se clampean en el reducer, no acá).
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < MIN_QUANTITY ||
    quantity > MAX_QUANTITY
  ) {
    return null;
  }

  const productImageUrl =
    typeof item.productImageUrl === "string" ? item.productImageUrl : null;
  const sizeId = typeof item.sizeId === "string" ? item.sizeId : null;
  const sizeLabel = typeof item.sizeLabel === "string" ? item.sizeLabel : null;

  return {
    productId,
    productSlug,
    productName,
    productImageUrl,
    unitPrice,
    quantity,
    sizeId,
    sizeLabel,
  };
}

/**
 * Lee el carrito desde localStorage. Nunca lanza: ante JSON inválido,
 * estructura inesperada, o localStorage no disponible (SSR, modo
 * privado, cuota excedida), devuelve un carrito vacío y limpia la
 * entrada corrupta cuando puede.
 */
export function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    return parsed
      .map(parseCartItem)
      .filter((item): item is CartItem => item !== null);
  } catch {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // localStorage inaccesible: no hay nada más que hacer, seguimos
      // con el carrito vacío en memoria para esta sesión.
    }
    return [];
  }
}

/** Best-effort: si falla (cuota excedida, modo privado, etc.) el carrito
 * sigue funcionando en memoria durante la sesión actual. */
export function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignorado a propósito, ver comentario de la función.
  }
}
