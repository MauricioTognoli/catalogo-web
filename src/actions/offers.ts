"use server";

import { revalidatePath } from "next/cache";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { findOfferConflict, validateOffer } from "@/lib/offers/pricing";
import { zonedLocalToUtc } from "@/lib/offers/time";

export type OfferActionState = { error: string | null };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const NO_BUSINESS = { error: "Necesitás configurar tu negocio antes de crear ofertas." };

type OfferRow = {
  id: string;
  product_id: string;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  featured: boolean;
};

/** Traduce las restricciones de la base a mensajes para el dueño. */
function databaseError(error: { code?: string; message?: string }): OfferActionState {
  if (error.code === "23P01") {
    return error.message?.includes("product_offer_one_featured")
      ? { error: "Ya hay otra oferta destacada en el banner en ese período." }
      : { error: "Este producto ya tiene otra oferta habilitada en ese período." };
  }
  if (error.code === "23514") {
    return { error: "Revisá el precio y las fechas de la oferta." };
  }
  return { error: "No se pudo guardar la oferta. Probá de nuevo." };
}

/** Ofertas habilitadas del negocio, para detectar superposiciones. */
async function loadEnabledOffers(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase
    .from("product_offer")
    .select("id, product_id, starts_at, ends_at, enabled, featured")
    .eq("business_id", businessId)
    .eq("enabled", true)
    .returns<OfferRow[]>();

  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    productId: row.product_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    enabled: row.enabled,
    featured: row.featured,
  }));
}

async function loadOwnedProduct(
  supabase: SupabaseClient,
  businessId: string,
  productId: string,
) {
  const { data, error } = await supabase
    .from("product")
    .select("id, price")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) return { error: "No se pudo verificar el producto. Probá de nuevo." };
  if (!data) return { error: "El producto no existe o no te pertenece." };
  return { product: { id: data.id as string, price: Number(data.price) } };
}

function revalidateOffers() {
  revalidatePath("/admin/ofertas");
  // Precios y banner de la tienda.
  revalidateCatalog();
}

/**
 * Crea o edita una oferta. Las fechas llegan como en el input
 * datetime-local ("2026-10-01T20:00") y se interpretan en la hora de la
 * tienda, no en la del servidor ni la del navegador.
 */
export async function saveOffer(
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const business = await getCurrentBusiness();
  if (!business) return NO_BUSINESS;

  const offerId = String(formData.get("offerId") ?? "").trim() || null;
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return { error: "Elegí un producto." };

  const priceRaw = String(formData.get("offerPrice") ?? "").trim();
  const offerPrice = Number(priceRaw);
  const startsAt = zonedLocalToUtc(String(formData.get("startsAt") ?? ""));
  const endsAt = zonedLocalToUtc(String(formData.get("endsAt") ?? ""));
  if (!startsAt || !endsAt) {
    return { error: "Revisá las fechas de inicio y fin." };
  }
  // Switches: solo viajan en el FormData cuando están activados.
  const enabled = formData.get("enabled") !== null;
  const featured = formData.get("featured") !== null;

  const supabase = await createClient();

  const owned = await loadOwnedProduct(supabase, business.id, productId);
  if ("error" in owned) return { error: owned.error ?? null };

  const valid = validateOffer({
    offerPrice: priceRaw === "" ? Number.NaN : offerPrice,
    regularPrice: owned.product.price,
    startsAt,
    endsAt,
    now: Date.now(),
  });
  if (!valid.ok) return { error: valid.error };

  if (offerId) {
    // Al editar, la oferta tiene que ser de este negocio.
    const { data: existing, error } = await supabase
      .from("product_offer")
      .select("id")
      .eq("id", offerId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (error) return { error: "No se pudo verificar la oferta. Probá de nuevo." };
    if (!existing) return { error: "La oferta no existe o no te pertenece." };
  }

  if (enabled) {
    const others = await loadEnabledOffers(supabase, business.id);
    if (!others) return { error: "No se pudieron revisar las otras ofertas. Probá de nuevo." };
    const conflict = findOfferConflict(
      { id: offerId ?? undefined, productId, startsAt, endsAt, featured },
      others,
    );
    if (conflict) return { error: conflict };
  }

  const values = {
    product_id: productId,
    offer_price: Math.round(offerPrice * 100) / 100,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    enabled,
    featured,
  };

  const { error } = offerId
    ? await supabase
        .from("product_offer")
        .update(values)
        .eq("id", offerId)
        .eq("business_id", business.id)
    : await supabase
        .from("product_offer")
        .insert({ ...values, business_id: business.id });

  if (error) return databaseError(error);

  revalidateOffers();
  return { error: null };
}

/** Activa o desactiva una oferta sin tocar precio ni fechas. */
export async function setOfferEnabled(
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const business = await getCurrentBusiness();
  if (!business) return NO_BUSINESS;

  const offerId = String(formData.get("offerId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!offerId) return { error: "Oferta inválida." };

  const supabase = await createClient();
  const { data: offer, error: fetchError } = await supabase
    .from("product_offer")
    .select("id, product_id, offer_price, starts_at, ends_at, featured, product(price)")
    .eq("id", offerId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) return { error: "No se pudo verificar la oferta. Probá de nuevo." };
  if (!offer) return { error: "La oferta no existe o no te pertenece." };

  if (enabled) {
    if (Date.parse(offer.ends_at) <= Date.now()) {
      return { error: "La oferta ya terminó. Editá las fechas para volver a usarla." };
    }
    const regularPrice = Number((offer.product as unknown as { price: number }).price);
    if (Number(offer.offer_price) >= regularPrice) {
      return {
        error: "El precio normal del producto bajó y ya no es mayor al de la oferta. Editá la oferta.",
      };
    }
    const others = await loadEnabledOffers(supabase, business.id);
    if (!others) return { error: "No se pudieron revisar las otras ofertas. Probá de nuevo." };
    const conflict = findOfferConflict(
      {
        id: offer.id,
        productId: offer.product_id,
        startsAt: offer.starts_at,
        endsAt: offer.ends_at,
        featured: offer.featured,
      },
      others,
    );
    if (conflict) return { error: conflict };
  }

  const { error } = await supabase
    .from("product_offer")
    .update({ enabled })
    .eq("id", offerId)
    .eq("business_id", business.id);
  if (error) return databaseError(error);

  revalidateOffers();
  return { error: null };
}

export async function deleteOffer(
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const business = await getCurrentBusiness();
  if (!business) return NO_BUSINESS;

  const offerId = String(formData.get("offerId") ?? "").trim();
  if (!offerId) return { error: "Oferta inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_offer")
    .delete()
    .eq("id", offerId)
    .eq("business_id", business.id)
    .select("id");

  if (error) return { error: "No se pudo eliminar la oferta. Probá de nuevo." };
  if (!data || data.length === 0) {
    return { error: "La oferta no existe o no te pertenece." };
  }

  revalidateOffers();
  return { error: null };
}
