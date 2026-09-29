import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { offerStatus, type OfferStatus } from "@/lib/offers/pricing";
import { getRequestNow } from "@/lib/offers/request-time";
import { formatStoreDateTime, utcToZonedLocal } from "@/lib/offers/time";
import { PageHeader } from "@/components/admin/page-header";
import { BusinessRequired } from "@/components/admin/business-required";
import { OffersList } from "./offers-list";
import type { OfferView, ProductOption } from "./types";

export const metadata: Metadata = {
  title: "Ofertas",
};

type OfferRow = {
  id: string;
  product_id: string;
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  featured: boolean;
  product: {
    name: string;
    price: number;
    available: boolean;
    product_image: { url: string; position: number }[];
  } | null;
};

// Vigentes primero, después programadas, desactivadas y finalizadas.
const STATUS_ORDER: Record<OfferStatus, number> = {
  active: 0,
  scheduled: 1,
  disabled: 2,
  ended: 3,
};

const HOUR_MS = 60 * 60 * 1000;

export default async function OfertasPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <>
        <PageHeader title="Ofertas" />
        <BusinessRequired description="Necesitás configurar tu negocio antes de crear ofertas." />
      </>
    );
  }

  const supabase = await createClient();
  const [offersResult, productsResult] = await Promise.all([
    supabase
      .from("product_offer")
      .select(
        "id, product_id, offer_price, starts_at, ends_at, enabled, featured, product(name, price, available, product_image(url, position))",
      )
      .eq("business_id", business.id)
      .order("starts_at", { ascending: false })
      .returns<OfferRow[]>(),
    supabase
      .from("product")
      .select("id, name, price, available")
      .eq("business_id", business.id)
      .order("name", { ascending: true }),
  ]);

  if (offersResult.error || productsResult.error) {
    throw offersResult.error ?? productsResult.error;
  }

  const now = getRequestNow();

  const offers: OfferView[] = offersResult.data
    .filter((row) => row.product !== null)
    .map((row) => {
      const product = row.product!;
      const offerPrice = Number(row.offer_price);
      const regularPrice = Number(product.price);
      return {
        id: row.id,
        productId: row.product_id,
        productName: product.name,
        productAvailable: product.available,
        coverUrl:
          [...product.product_image].sort((a, b) => a.position - b.position)[0]?.url ??
          null,
        regularPrice,
        offerPrice,
        startsAtLocal: utcToZonedLocal(new Date(row.starts_at)),
        endsAtLocal: utcToZonedLocal(new Date(row.ends_at)),
        startsLabel: formatStoreDateTime(row.starts_at),
        endsLabel: formatStoreDateTime(row.ends_at),
        enabled: row.enabled,
        featured: row.featured,
        status: offerStatus(
          { enabled: row.enabled, offerPrice, startsAt: row.starts_at, endsAt: row.ends_at },
          now,
        ),
        priceInvalid: offerPrice >= regularPrice,
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const products: ProductOption[] = productsResult.data.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    available: product.available,
  }));

  // Sugerencia para una oferta nueva: desde la próxima hora en punto,
  // durante una semana (en hora de la tienda).
  const nextHour = Math.ceil(now / HOUR_MS) * HOUR_MS;
  const activeCount = offers.filter((offer) => offer.status === "active").length;

  return (
    <>
      <PageHeader
        title="Ofertas"
        description={
          activeCount > 0
            ? `${activeCount} ${activeCount === 1 ? "oferta activa" : "ofertas activas"} ahora. Los precios vuelven solos al normal al terminar cada oferta.`
            : "Precios promocionales por tiempo limitado. Vuelven solos al precio normal al terminar."
        }
      />
      <OffersList
        offers={offers}
        products={products}
        defaultStartsAt={utcToZonedLocal(new Date(nextHour))}
        defaultEndsAt={utcToZonedLocal(new Date(nextHour + 7 * 24 * HOUR_MS))}
      />
    </>
  );
}
