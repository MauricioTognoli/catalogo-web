export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

export type CartItem = {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string | null;
  /** Precio unitario vigente (el promocional si hay oferta). */
  unitPrice: number;
  /** Precio normal, solo si unitPrice es de una oferta. */
  listPrice: number | null;
  quantity: number;
  sizeId: string | null;
  sizeLabel: string | null;
};

/**
 * Identidad de una línea del carrito: mismo producto + mismo talle suman
 * cantidad; mismo producto + talle distinto son líneas separadas.
 */
export function isSameCartLine(
  a: { productId: string; sizeId: string | null },
  b: { productId: string; sizeId: string | null },
): boolean {
  return a.productId === b.productId && a.sizeId === b.sizeId;
}
