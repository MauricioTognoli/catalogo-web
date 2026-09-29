"use client";

import { useCart } from "@/lib/cart/cart-context";
import { buildOrderMessage } from "@/lib/whatsapp/buildOrderMessage";
import { buildWhatsAppUrl, hasWhatsAppNumber } from "@/lib/whatsapp/buildWhatsAppUrl";

/**
 * Solo se ocupa de la interacción (armar el link y presentarlo); el
 * armado del mensaje y de la URL vive en src/lib/whatsapp, como
 * funciones puras testeadas por separado.
 *
 * Abrir WhatsApp no descuenta stock ni reserva unidades: el pedido se
 * confirma en la conversación y el dueño ajusta el stock en el panel.
 */
export function WhatsAppCheckoutButton({
  businessName,
  whatsappNumber,
  disabledReason,
}: {
  businessName: string;
  whatsappNumber: string;
  /** Si viene, el botón queda deshabilitado mostrando este texto. */
  disabledReason?: string | null;
}) {
  const { items } = useCart();

  if (!hasWhatsAppNumber(whatsappNumber)) {
    // El schema exige whatsapp_number NOT NULL y el panel admin valida su
    // formato antes de guardar, así que este caso no debería darse en la
    // práctica. Igual lo cubrimos: mejor un mensaje claro que un link roto.
    return (
      <p role="alert" className="text-sm text-red-600">
        Este negocio todavía no configuró un WhatsApp para recibir pedidos.
      </p>
    );
  }

  if (disabledReason) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-200 px-4 text-center text-sm font-medium text-zinc-500"
      >
        {disabledReason}
      </button>
    );
  }

  const message = buildOrderMessage(businessName, items);
  const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center justify-center rounded-full bg-green-600 px-4 text-center text-sm font-medium text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      Finalizar por WhatsApp
    </a>
  );
}
