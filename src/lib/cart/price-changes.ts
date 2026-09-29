import { formatPrice } from "@/lib/utils/formatPrice";
import { isSameCartLine, type CartItem } from "./types";

export type CurrentLinePrice = {
  productId: string;
  sizeId: string | null;
  unitPrice: number;
  listPrice: number | null;
};

export type PriceChange = CurrentLinePrice & {
  productName: string;
  previousUnitPrice: number;
  reason: "offer_ended" | "offer_started" | "price_changed";
};

/** Líneas del carrito cuyo precio guardado ya no es el vigente. */
export function diffCartPrices(
  items: CartItem[],
  current: CurrentLinePrice[],
): PriceChange[] {
  const changes: PriceChange[] = [];

  for (const item of items) {
    const now = current.find((line) => isSameCartLine(line, item));
    if (!now) continue;
    if (now.unitPrice === item.unitPrice && now.listPrice === item.listPrice) continue;

    const reason =
      item.listPrice !== null && now.listPrice === null
        ? "offer_ended"
        : item.listPrice === null && now.listPrice !== null
          ? "offer_started"
          : "price_changed";

    changes.push({
      ...now,
      productName: item.productName,
      previousUnitPrice: item.unitPrice,
      reason,
    });
  }

  return changes;
}

/** Aviso para el cliente, sin ambigüedad sobre qué precio se va a enviar. */
export function describePriceChange(change: PriceChange): string {
  const to = formatPrice(change.unitPrice);
  const from = formatPrice(change.previousUnitPrice);
  switch (change.reason) {
    case "offer_ended":
      return `Terminó la oferta de ${change.productName}: el precio pasó de ${from} a ${to}.`;
    case "offer_started":
      return `${change.productName} ahora está en oferta: el precio pasó de ${from} a ${to}.`;
    case "price_changed":
      return `Cambió el precio de ${change.productName}: de ${from} a ${to}.`;
  }
}
