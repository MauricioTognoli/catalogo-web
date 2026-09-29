import { earliestEnd } from "@/lib/offers/pricing";
import { getRequestNow } from "@/lib/offers/request-time";
import { RefreshAtOfferEnd } from "./offer-clock";

/**
 * Una vez por página: si alguna oferta mostrada vence con la página
 * abierta, se piden datos nuevos y vuelven los precios normales.
 */
export function OfferRefresher({ endsAt }: { endsAt: (string | null)[] }) {
  const next = earliestEnd(endsAt);
  if (!next) return null;
  return <RefreshAtOfferEnd at={next} serverNow={getRequestNow()} />;
}
