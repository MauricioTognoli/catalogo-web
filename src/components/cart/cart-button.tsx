"use client";

import { useCart } from "@/lib/cart/cart-context";

export function CartButton() {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={
        itemCount > 0
          ? `Abrir carrito, ${itemCount} ${itemCount === 1 ? "unidad" : "unidades"}`
          : "Abrir carrito, vacío"
      }
      className="flex min-h-11 items-center gap-2 rounded-full border border-zinc-300 px-4 py-1.5 text-sm hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
      </svg>
      <span>Carrito{itemCount > 0 ? ` (${itemCount})` : ""}</span>
    </button>
  );
}
