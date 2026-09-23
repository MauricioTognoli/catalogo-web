"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart/types";
import type { PublicProductDetail } from "@/lib/catalog/products";

export function AddToCartForm({
  product,
  mainImageUrl,
}: {
  product: PublicProductDetail;
  mainImageUrl: string | null;
}) {
  const { addItem, openCart } = useCart();
  const hasSizes = product.sizes.length > 0;

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [sizeError, setSizeError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleAdd() {
    if (hasSizes && !selectedSizeId) {
      setSizeError(true);
      setFeedback(null);
      return;
    }

    // product.sizes ya viene filtrado por available = true desde
    // getPublicProduct, así que cualquier size.id elegible acá siempre
    // es un talle disponible.
    const selectedSize =
      product.sizes.find((size) => size.id === selectedSizeId) ?? null;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImageUrl: mainImageUrl,
      unitPrice: product.price,
      quantity,
      sizeId: selectedSize?.id ?? null,
      sizeLabel: selectedSize?.label ?? null,
    });

    setSizeError(false);
    setFeedback("Producto agregado al carrito.");
    openCart();
  }

  return (
    <div className="space-y-4 border-t border-zinc-200 pt-4">
      {hasSizes && (
        <div>
          <span id="size-label" className="block text-sm font-medium text-zinc-900">
            Talle
          </span>
          <div
            role="group"
            aria-labelledby="size-label"
            className="mt-2 flex flex-wrap gap-2"
          >
            {product.sizes.map((size) => (
              <button
                key={size.id}
                type="button"
                aria-pressed={selectedSizeId === size.id}
                onClick={() => {
                  setSelectedSizeId(size.id);
                  setSizeError(false);
                }}
                className={`min-h-11 min-w-11 rounded-full border px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  selectedSizeId === size.id
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-zinc-300"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
          {sizeError && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              Elegí un talle antes de agregar al carrito.
            </p>
          )}
        </div>
      )}

      <div>
        <span id="quantity-label" className="block text-sm font-medium text-zinc-900">
          Cantidad
        </span>
        <div
          role="group"
          aria-labelledby="quantity-label"
          className="mt-2 flex w-fit items-center rounded-full border border-zinc-300"
        >
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(MIN_QUANTITY, q - 1))}
            disabled={quantity <= MIN_QUANTITY}
            aria-label="Restar una unidad"
            className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-40"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-[2ch] px-2 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
            disabled={quantity >= MAX_QUANTITY}
            aria-label="Sumar una unidad"
            className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand/90"
      >
        Agregar al carrito
      </button>

      {feedback && (
        <p role="status" className="text-sm text-green-700">
          {feedback}
        </p>
      )}
    </div>
  );
}
