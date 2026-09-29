"use client";

import { useEffect, useMemo, useState } from "react";
import { checkCartStock, type CartStockResult } from "@/actions/stock";
import type { CartLineStatus } from "@/lib/stock/availability";
import type { PriceUpdate } from "./cart-context";
import { describePriceChange, diffCartPrices } from "./price-changes";
import type { CartItem } from "./types";

const DEBOUNCE_MS = 250;
/** Margen tras el vencimiento, para que el servidor ya lo vea vencido. */
const EXPIRY_GRACE_MS = 500;
/** setTimeout no admite demoras mayores (~24,8 días). */
const MAX_TIMEOUT_MS = 2_147_483_647;

export type CartCheck = {
  /** Hay una verificación en curso para el carrito actual. */
  checking: boolean;
  /** La última verificación falló (red/servidor). */
  failed: boolean;
  statusOf: (item: Pick<CartItem, "productId" | "sizeId">) => CartLineStatus | null;
  /** Avisos de precios que cambiaron desde que se abrió el carrito. */
  priceNotices: string[];
  /**
   * ¿Los precios confirmados ya pueden estar vencidos? (pasó el fin de
   * alguna oferta y la nueva verificación todavía no volvió). Se consulta
   * al hacer clic, por si el timer se demoró con la pestaña en segundo plano.
   */
  isPriceStale: () => boolean;
  retry: () => void;
};

/**
 * Revalida contra el servidor el stock y el precio de lo guardado en el
 * carrito (localStorage puede tener días). Corre al abrir el carrito
 * (`nonce` cambia en cada apertura), cada vez que cambian las líneas y
 * cuando vence la oferta más próxima del carrito. Si un precio cambió, lo
 * actualiza en el carrito (así el total y el mensaje usan el vigente) y
 * deja un aviso. No reserva unidades.
 */
export function useCartCheck(
  items: CartItem[],
  enabled: boolean,
  nonce: number,
  syncPrices: (updates: PriceUpdate[]) => void,
): CartCheck {
  const lines = useMemo(
    () =>
      items.map(({ productId, sizeId, quantity }) => ({
        productId,
        sizeId,
        quantity,
      })),
    [items],
  );
  // Se incrementa al vencer una oferta o al reintentar: fuerza otra consulta.
  const [recheck, setRecheck] = useState(0);
  const key =
    enabled && lines.length > 0
      ? `${nonce}|${recheck}|${JSON.stringify(lines)}`
      : null;

  // Se guarda la clave con el resultado: "verificando" se deriva de que la
  // clave actual todavía no tiene respuesta, sin setState síncrono en el
  // efecto.
  const [result, setResult] = useState<{
    key: string;
    data: CartStockResult;
  } | null>(null);
  const [notices, setNotices] = useState<{ nonce: number; messages: string[] }>({
    nonce,
    messages: [],
  });

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      checkCartStock(lines)
        .then((data) => {
          if (cancelled) return;

          if (data.ok) {
            const current = data.statuses.flatMap((line) =>
              line.unitPrice === null
                ? []
                : [{ ...line, unitPrice: line.unitPrice }],
            );
            const changes = diffCartPrices(items, current);
            if (changes.length > 0) {
              // Cambia items -> nueva clave -> una verificación más, que ya
              // coincide y no produce avisos.
              syncPrices(changes);
              const messages = changes.map(describePriceChange);
              setNotices((previous) => ({
                nonce,
                messages:
                  previous.nonce === nonce
                    ? [...previous.messages, ...messages]
                    : messages,
              }));
            }
          }

          setResult({ key, data });
        })
        .catch(() => {
          if (!cancelled) setResult({ key, data: { ok: false } });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, lines, items, nonce, syncPrices]);

  const isCurrent = result !== null && result.key === key;
  // Mientras se verifica un cambio se siguen mostrando los avisos de la
  // verificación anterior, para que no parpadeen.
  const data = result?.data ?? null;
  const validUntil = isCurrent && data?.ok ? data.validUntil : null;

  // Revalida justo cuando vence la oferta más próxima del carrito.
  useEffect(() => {
    if (!validUntil || !enabled) return;
    const delay = Date.parse(validUntil) - Date.now() + EXPIRY_GRACE_MS;
    if (delay > MAX_TIMEOUT_MS) return;
    const timer = setTimeout(
      () => setRecheck((value) => value + 1),
      Math.max(0, delay),
    );
    return () => clearTimeout(timer);
  }, [validUntil, enabled]);

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
    priceNotices: notices.nonce === nonce ? notices.messages : [],
    isPriceStale: () => validUntil !== null && Date.now() >= Date.parse(validUntil),
    retry: () => setRecheck((value) => value + 1),
  };
}
