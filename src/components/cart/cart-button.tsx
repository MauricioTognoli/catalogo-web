"use client";

import { ShoppingBag } from "lucide-react";
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
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md text-zinc-800 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <ShoppingBag className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] leading-none font-semibold text-brand-foreground"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
