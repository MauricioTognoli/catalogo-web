import { cache } from "react";
import { getCatalogProductRows } from "@/lib/catalog/products";
import { isPublicProductPurchasable } from "@/lib/stock/availability";
import { getActiveOffers } from "./active";
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

export type FeaturedOfferRow = {
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    in_stock: boolean;
    product_image: { url: string; position: number }[];
    product_size: { available: boolean; in_stock: boolean }[];
  };
};

function toFeaturedOffer(row: FeaturedOfferRow, now: number): FeaturedOffer | null {
  // No se promociona en el banner algo que no se puede comprar: la
  // portada muestra su banner habitual hasta que vuelva a haber stock.
  const purchasable = isPublicProductPurchasable({
    inStock: row.product.in_stock,
    sizes: row.product.product_size.map((size) => ({
      available: size.available,
      inStock: size.in_stock,
    })),
  });
  if (!purchasable) return null;

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
}

export function pickFeaturedOffer(
  rows: FeaturedOfferRow[],
  now: number,
): FeaturedOffer | null {
  const byEnd = [...rows].sort(
    (a, b) => Date.parse(a.ends_at) - Date.parse(b.ends_at),
  );
  for (const row of byEnd) {
    const offer = toFeaturedOffer(row, now);
    if (offer) return offer;
  }
  return null;
}

/**
 * Oferta destacada vigente del negocio, para el banner. Se calcula en cada
 * request con la hora del servidor: cuando vence, la portada vuelve sola a
 * su banner habitual, sin volver a publicar.
 */
export const getFeaturedOffer = cache(
  async (businessId: string): Promise<FeaturedOffer | null> => {
    const [rows, offers] = await Promise.all([
      getCatalogProductRows(businessId),
      getActiveOffers(businessId),
    ]);
    const products = new Map(rows.map((row) => [row.id, row]));

    const featured = offers.flatMap((offer): FeaturedOfferRow[] => {
      const product = offer.featured ? products.get(offer.productId) : undefined;
      if (!product) return [];
      return [
        {
          offer_price: offer.offerPrice,
          starts_at: String(offer.startsAt),
          ends_at: String(offer.endsAt),
          enabled: offer.enabled,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            in_stock: product.in_stock,
            product_image: product.product_image,
            product_size: product.product_size,
          },
        },
      ];
    });

    return pickFeaturedOffer(featured, getRequestNow());
  },
);
