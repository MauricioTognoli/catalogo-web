import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { inStockFirst, isPublicProductPurchasable } from "@/lib/stock/availability";
import { effectivePrice, type OfferLike } from "@/lib/offers/pricing";
import { getRequestNow } from "@/lib/offers/request-time";

/**
 * Ofertas embebidas. Para visitantes la RLS ya devuelve solo las vigentes;
 * si mira el dueño con sesión llegan todas, y effectivePrice filtra por
 * habilitada y período igual.
 */
type OfferRow = {
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
};

const OFFER_COLUMNS = "product_offer(offer_price, starts_at, ends_at, enabled)";

function toOffers(rows: OfferRow[] | null | undefined): OfferLike[] {
  return (rows ?? []).map((row) => ({
    offerPrice: Number(row.offer_price),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    enabled: row.enabled,
  }));
}

/** Precio de un producto en este request (el "ahora" es el del servidor). */
function priceNow(regularPrice: number, offers: OfferRow[] | null | undefined) {
  return effectivePrice(Number(regularPrice), toOffers(offers), getRequestNow());
}

export type PublicProductCard = {
  id: string;
  name: string;
  slug: string;
  /** Precio vigente: el promocional si hay oferta activa. */
  price: number;
  /** Precio normal (tachado) mientras dura una oferta. */
  compareAtPrice: number | null;
  /** Fin real de la oferta vigente (ISO). */
  offerEndsAt: string | null;
  material: string | null;
  mainImageUrl: string | null;
  hasAvailableSizes: boolean;
  /** "En stock" / "Sin stock". La tienda nunca recibe cantidades. */
  inStock: boolean;
};

export type PublicProductImage = {
  id: string;
  url: string;
  position: number;
};

export type PublicProductSize = {
  id: string;
  label: string;
  position: number;
  inStock: boolean;
};

export type PublicProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Precio vigente: el promocional si hay oferta activa. */
  price: number;
  compareAtPrice: number | null;
  offerEndsAt: string | null;
  material: string | null;
  images: PublicProductImage[];
  /** Solo talles activos, en orden. Los sin stock se muestran deshabilitados. */
  sizes: PublicProductSize[];
  inStock: boolean;
};

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  in_stock: boolean;
  product_offer: OfferRow[];
  product_image: { url: string; position: number }[];
  // Todos los talles del producto (la RLS pública ya no oculta los
  // desactivados), para saber si el stock se gestiona por talle.
  product_size: { available: boolean; in_stock: boolean }[];
};

function toProductCard(row: ProductListRow): PublicProductCard {
  const mainImage = [...row.product_image].sort(
    (a, b) => a.position - b.position,
  )[0];

  const pricing = priceNow(row.price, row.product_offer);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    offerEndsAt: pricing.offerEndsAt,
    material: row.material,
    mainImageUrl: mainImage?.url ?? null,
    hasAvailableSizes: row.product_size.some(
      (size) => size.available && size.in_stock,
    ),
    inStock: isPublicProductPurchasable({
      inStock: row.in_stock,
      sizes: row.product_size.map((size) => ({
        available: size.available,
        inStock: size.in_stock,
      })),
    }),
  };
}

/**
 * Productos disponibles (`available = true`) de un negocio, opcionalmente
 * filtrados por categoría. Usada tanto por el home como por la página de
 * categoría, para no duplicar la query entre ambas.
 */
export const getPublicProducts = cache(
  async (
    businessId: string,
    categoryId?: string,
  ): Promise<PublicProductCard[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("product")
      .select(
        `id, name, slug, price, material, in_stock, product_image(url, position), product_size(available, in_stock), ${OFFER_COLUMNS}`,
      )
      .eq("business_id", businessId)
      .eq("available", true)
      .order("created_at", { ascending: false });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query.returns<ProductListRow[]>();

    if (error) {
      throw error;
    }

    return inStockFirst((data ?? []).map(toProductCard));
  },
);

/**
 * Búsqueda de productos disponibles por nombre. Usa `ilike` (case
 * insensitive) sobre `name`; un `query` vacío devuelve lista vacía en
 * vez de todo el catálogo, para no confundir "sin búsqueda" con
 * "buscar todo".
 */
export const searchPublicProducts = cache(
  async (
    businessId: string,
    query: string,
  ): Promise<PublicProductCard[]> => {
    const trimmedQuery = query.trim();

    if (trimmedQuery === "") {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product")
      .select(
        `id, name, slug, price, material, in_stock, product_image(url, position), product_size(available, in_stock), ${OFFER_COLUMNS}`,
      )
      .eq("business_id", businessId)
      .eq("available", true)
      .ilike("name", `%${trimmedQuery}%`)
      .order("created_at", { ascending: false })
      .returns<ProductListRow[]>();

    if (error) {
      throw error;
    }

    return inStockFirst((data ?? []).map(toProductCard));
  },
);

/** Resuelve por business_id + slug, nunca por nombre. */
export const getPublicProduct = cache(
  async (
    businessId: string,
    slug: string,
  ): Promise<PublicProductDetail | null> => {
    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("product")
      .select(
        `id, name, slug, description, price, material, in_stock, ${OFFER_COLUMNS}`,
      )
      .eq("business_id", businessId)
      .eq("slug", slug)
      .eq("available", true)
      .maybeSingle();

    if (productError) {
      throw productError;
    }

    if (!product) {
      return null;
    }

    const [
      { data: images, error: imagesError },
      { data: sizes, error: sizesError },
    ] = await Promise.all([
      supabase
        .from("product_image")
        .select("id, url, position")
        .eq("product_id", product.id)
        .order("position", { ascending: true }),
      // Todos los talles: los desactivados no se muestran, pero cuentan
      // para saber que el producto se vende por talle.
      supabase
        .from("product_size")
        .select("id, label, position, available, in_stock")
        .eq("product_id", product.id)
        .order("position", { ascending: true }),
    ]);

    if (imagesError || sizesError) {
      throw imagesError ?? sizesError;
    }

    const allSizes = sizes ?? [];
    const {
      in_stock: productInStock,
      product_offer: offers,
      ...productFields
    } = product;

    return {
      ...productFields,
      ...priceNow(product.price, offers as OfferRow[]),
      images: images ?? [],
      sizes: allSizes
        .filter((size) => size.available)
        .map((size) => ({
          id: size.id,
          label: size.label,
          position: size.position,
          inStock: size.in_stock,
        })),
      inStock: isPublicProductPurchasable({
        inStock: productInStock,
        sizes: allSizes.map((size) => ({
          available: size.available,
          inStock: size.in_stock,
        })),
      }),
    };
  },
);
