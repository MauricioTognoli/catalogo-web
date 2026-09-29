import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { effectivePrice } from "./pricing";
import { getRequestNow } from "./request-time";

export type FeaturedOffer = {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number;
  endsAt: string;
};

type FeaturedOfferRow = {
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    product_image: { url: string; position: number }[];
  };
};

/**
 * Oferta destacada vigente del negocio, para el banner. Se calcula en cada
 * request con la hora del servidor: cuando vence, la portada vuelve sola a
 * su banner habitual, sin volver a publicar.
 */
export const getFeaturedOffer = cache(
  async (businessId: string): Promise<FeaturedOffer | null> => {
    const supabase = await createClient();
    const now = getRequestNow();
    const nowIso = new Date(now).toISOString();

    const { data, error } = await supabase
      .from("product_offer")
      .select(
        "offer_price, starts_at, ends_at, enabled, product!inner(id, name, slug, price, product_image(url, position))",
      )
      .eq("featured", true)
      .eq("enabled", true)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso)
      .eq("product.business_id", businessId)
      .eq("product.available", true)
      .order("ends_at", { ascending: true })
      .limit(1)
      .returns<FeaturedOfferRow[]>();

    // Sin la tabla (migración pendiente) o con error, la portada sigue con
    // su banner habitual.
    if (error) {
      console.error("No se pudo leer la oferta destacada", error);
      return null;
    }

    const row = data?.[0];
    if (!row) return null;

    const pricing = effectivePrice(
      Number(row.product.price),
      [
        {
          offerPrice: Number(row.offer_price),
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          enabled: row.enabled,
        },
      ],
      now,
    );
    // Precio normal que bajó por debajo del promocional: no hay oferta.
    if (pricing.compareAtPrice === null || !pricing.offerEndsAt) return null;

    const cover = [...row.product.product_image].sort(
      (a, b) => a.position - b.position,
    )[0];

    return {
      productId: row.product.id,
      productName: row.product.name,
      productSlug: row.product.slug,
      imageUrl: cover?.url ?? null,
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice,
      endsAt: pricing.offerEndsAt,
    };
  },
);
