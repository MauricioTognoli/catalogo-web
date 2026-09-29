"use client";

import { useEffect, useMemo, useState } from "react";
import { checkCartStock, type CartStockResult } from "@/actions/stock";
import type { CartLineStatus } from "@/lib/stock/availability";
import type { CartItem } from "./types";

const DEBOUNCE_MS = 250;

export type CartStockCheck = {
  /** Hay una verificación en curso para el carrito actual. */
  checking: boolean;
  /** La última verificación falló (red/servidor): no se bloquea el pedido. */
  failed: boolean;
  statusOf: (item: Pick<CartItem, "productId" | "sizeId">) => CartLineStatus | null;
};

/**
 * Revalida contra el servidor el stock de lo guardado en el carrito
 * (localStorage puede tener días). Corre al abrir el carrito (`nonce`
 * cambia en cada apertura) y cada vez que cambian las líneas mientras
 * está abierto. No reserva unidades.
 */
export function useCartStockCheck(
  items: CartItem[],
  enabled: boolean,
  nonce: number,
): CartStockCheck {
  const lines = useMemo(
    () =>
      items.map(({ productId, sizeId, quantity }) => ({
        productId,
        sizeId,
        quantity,
      })),
    [items],
  );
  const key =
    enabled && lines.length > 0 ? `${nonce}|${JSON.stringify(lines)}` : null;

  // Se guarda la clave con el resultado: "verificando" se deriva de que la
  // clave actual todavía no tiene respuesta, sin setState síncrono en el
  // efecto.
  const [result, setResult] = useState<{
    key: string;
    data: CartStockResult;
  } | null>(null);

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      checkCartStock(lines)
        .then((data) => {
          if (!cancelled) setResult({ key, data });
        })
        .catch(() => {
          if (!cancelled) setResult({ key, data: { ok: false } });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, lines]);

  const isCurrent = result !== null && result.key === key;
  // Mientras se verifica un cambio se siguen mostrando los avisos de la
  // verificación anterior, para que no parpadeen.
  const data = result?.data ?? null;

  return {
    checking: key !== null && !isCurrent,
    failed: isCurrent && !result.data.ok,
    statusOf: (item) => {
      if (!data || !data.ok) return null;
      const match = data.statuses.find(
        (status) =>
          status.productId === item.productId && status.sizeId === item.sizeId,
      );
      // Línea que la verificación no reconoció (ids corruptos): no se ofrece.
      return match?.status ?? (isCurrent ? "unavailable" : null);
    },
  };
}
