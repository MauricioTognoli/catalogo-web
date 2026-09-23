"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/utils/formatPrice";
import type { PublicBusiness } from "@/lib/catalog/business";
import { CartLineItem } from "./cart-line-item";
import { WhatsAppCheckoutButton } from "./whatsapp-checkout-button";

/**
 * Se usa el elemento <dialog> nativo en vez de un div con role="dialog"
 * hecho a mano: el navegador ya resuelve gratis el focus trap, el cierre
 * con Escape, el backdrop y la semántica de modal — evita reimplementar
 * esa lógica de accesibilidad nosotros mismos, sin agregar ninguna
 * librería.
 */
export function CartDrawer({
  business,
}: {
  business: Pick<PublicBusiness, "name" | "whatsapp_number">;
}) {
  const { isOpen, closeCart, items, subtotal } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sincroniza el estado de React con la API imperativa del <dialog>
  // (showModal/close no tienen equivalente declarativo): esto es
  // sincronización con un sistema externo, no un ajuste de props entre
  // componentes React.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    // Un clic en el backdrop nativo llega con target === el propio
    // <dialog>; un clic dentro del panel llega con target = un hijo.
    if (event.target === dialogRef.current) {
      closeCart();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={closeCart}
      onClick={handleDialogClick}
      aria-label="Carrito de compras"
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50"
    >
      <div className="ml-auto flex h-full w-full max-w-sm flex-col bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <h2 className="font-serif text-lg text-zinc-900">Carrito</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-zinc-600">Tu carrito está vacío.</p>
            <Link
              href="/"
              onClick={closeCart}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {items.map((item) => (
                <CartLineItem
                  key={`${item.productId}-${item.sizeId ?? "none"}`}
                  item={item}
                />
              ))}
            </ul>

            <div className="space-y-3 border-t border-zinc-200 px-4 py-4">
              <div className="flex items-center justify-between font-semibold text-zinc-900">
                <span>Subtotal</span>
                <span className="text-brand">{formatPrice(subtotal)}</span>
              </div>

              <WhatsAppCheckoutButton
                businessName={business.name}
                whatsappNumber={business.whatsapp_number}
              />

              <Link
                href="/"
                onClick={closeCart}
                className="block rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-medium hover:border-brand hover:text-brand"
              >
                Seguir comprando
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
