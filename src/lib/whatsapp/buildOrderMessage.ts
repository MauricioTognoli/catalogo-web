import { formatPrice } from "@/lib/utils/formatPrice";
import type { CartItem } from "@/lib/cart/types";

/**
 * Arma el texto del mensaje de WhatsApp para cerrar un pedido a partir
 * del carrito. Función pura (sin localStorage, DOM ni red) para que sea
 * fácil de testear de forma aislada.
 */
export function buildOrderMessage(
  businessName: string,
  items: CartItem[],
): string {
  const lines: string[] = [
    "Hola! Quiero realizar el siguiente pedido:",
    "",
    `*${businessName}*`,
    "",
  ];

  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity;

    lines.push(`• ${item.productName}`);
    if (item.sizeLabel) {
      lines.push(`Talle: ${item.sizeLabel}`);
    }
    lines.push(`Cantidad: ${item.quantity}`);
    lines.push(`Precio: ${formatPrice(item.unitPrice)}`);
    lines.push(`Total: ${formatPrice(lineTotal)}`);
    lines.push("");
  }

  const orderTotal = items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );

  lines.push(`Total: ${formatPrice(orderTotal)}`);
  lines.push("");
  lines.push("¡Gracias!");

  return lines.join("\n");
}
