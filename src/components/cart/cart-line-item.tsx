"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/utils/formatPrice";
import { ImagePlaceholder } from "@/components/catalog/image-placeholder";
import { MAX_QUANTITY, type CartItem } from "@/lib/cart/types";

export function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const lineTotal = item.unitPrice * item.quantity;
  const lineLabel = item.sizeLabel
    ? `${item.productName}, talle ${item.sizeLabel}`
    : item.productName;

  return (
    <li className="flex gap-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
        {item.productImageUrl ? (
          <Image
            src={item.productImageUrl}
            alt={item.productName}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <ImagePlaceholder label="Sin imagen" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{item.productName}</p>
        {item.sizeLabel && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Talle: {item.sizeLabel}
          </p>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatPrice(item.unitPrice)}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label={`Cantidad de ${lineLabel}`}
            className="flex items-center rounded border border-zinc-300 dark:border-zinc-700"
          >
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, item.sizeId, item.quantity - 1)
              }
              aria-label={`Restar una unidad de ${lineLabel}`}
              className="px-2 py-1 text-sm"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="min-w-[2ch] px-1 text-center text-sm"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, item.sizeId, item.quantity + 1)
              }
              disabled={item.quantity >= MAX_QUANTITY}
              aria-label={`Sumar una unidad de ${lineLabel}`}
              className="px-2 py-1 text-sm disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.productId, item.sizeId)}
            aria-label={`Eliminar ${lineLabel} del carrito`}
            className="text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Eliminar
          </button>
        </div>
      </div>

      <p className="shrink-0 text-sm font-semibold">{formatPrice(lineTotal)}</p>
    </li>
  );
}
