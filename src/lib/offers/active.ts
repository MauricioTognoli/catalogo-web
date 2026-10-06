import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { OfferLike } from "./pricing";

export type ActiveOffer = OfferLike & {
  productId: string;
  featured: boolean;
};

type ActiveOfferRow = {
  product_id: string;
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  featured: boolean;
};

export const getActiveOffers = cache(
  async (businessId: string): Promise<ActiveOffer[]> => {
    await connection();
    const supabase = createPublicClient({ cached: false });

    const { data, error } = await supabase
      .from("product_offer")
      .select(
        "product_id, offer_price, starts_at, ends_at, enabled, featured, product!inner(business_id)",
      )
      .eq("product.business_id", businessId)
      .eq("enabled", true)
      .returns<ActiveOfferRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      productId: row.product_id,
      offerPrice: Number(row.offer_price),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      enabled: row.enabled,
      featured: row.featured,
    }));
  },
);

export function offersByProduct(offers: ActiveOffer[]): Map<string, ActiveOffer[]> {
  const grouped = new Map<string, ActiveOffer[]>();
  for (const offer of offers) {
    grouped.set(offer.productId, [...(grouped.get(offer.productId) ?? []), offer]);
  }
  return grouped;
}
