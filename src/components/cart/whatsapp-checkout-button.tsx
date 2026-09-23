"use client";

import { useCart } from "@/lib/cart/cart-context";
import { buildOrderMessage } from "@/lib/whatsapp/buildOrderMessage";
import { buildWhatsAppUrl, hasWhatsAppNumber } from "@/lib/whatsapp/buildWhatsAppUrl";

/**
 * Solo se ocupa de la interacción (armar el link y presentarlo); el
 * armado del mensaje y de la URL vive en src/lib/whatsapp, como
 * funciones puras testeadas por separado.
 */
export function WhatsAppCheckoutButton({
  businessName,
  whatsappNumber,
}: {
  businessName: string;
  whatsappNumber: string;
}) {
  const { items } = useCart();

  if (!hasWhatsAppNumber(whatsappNumber)) {
    // El schema exige whatsapp_number NOT NULL y el panel admin valida su
    // formato antes de guardar, así que este caso no debería darse en la
    // práctica. Igual lo cubrimos: mejor un mensaje claro que un link roto.
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Este negocio todavía no configuró un WhatsApp para recibir pedidos.
      </p>
    );
  }

  const message = buildOrderMessage(businessName, items);
  const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center justify-center rounded bg-green-600 px-4 text-center text-sm font-medium text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
    >
      Finalizar por WhatsApp
    </a>
  );
}
