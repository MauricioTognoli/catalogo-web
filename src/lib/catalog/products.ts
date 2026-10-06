import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { inStockFirst, isPublicProductPurchasable } from "@/lib/stock/availability";
import { effectivePrice, type OfferLike } from "@/lib/offers/pricing";
import { getActiveOffers, offersByProduct } from "@/lib/offers/active";
import { getRequestNow } from "@/lib/offers/request-time";

const CARD_COLUMNS =
  "id, category_id, name, slug, price, material, in_stock, product_image(url, position), product_size(available, in_stock)";

/** Precio de un producto en este request (el "ahora" es el del servidor). */
function priceNow(regularPrice: number, offers: OfferLike[] | undefined) {
  return effectivePrice(Number(regularPrice), offers ?? [], getRequestNow());
}

export type PublicProductCard = {
  id: string;
  categoryId: string | null;
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
  category: { name: string; slug: string } | null;
  images: PublicProductImage[];
  /** Solo talles activos, en orden. Los sin stock se muestran deshabilitados. */
  sizes: PublicProductSize[];
  inStock: boolean;
};

export type ProductListRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  in_stock: boolean;
  product_image: { url: string; position: number }[];
  // Todos los talles del producto (la RLS pública ya no oculta los
  // desactivados), para saber si el stock se gestiona por talle.
  product_size: { available: boolean; in_stock: boolean }[];
};

type ProductDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  material: string | null;
  in_stock: boolean;
  category: { name: string; slug: string } | null;
  product_image: PublicProductImage[];
  product_size: {
    id: string;
    label: string;
    position: number;
    available: boolean;
    in_stock: boolean;
  }[];
};

function toProductCard(row: ProductListRow, offers: OfferLike[] | undefined): PublicProductCard {
  const mainImage = [...row.product_image].sort(
    (a, b) => a.position - b.position,
  )[0];

  const pricing = priceNow(row.price, offers);

  return {
    id: row.id,
    categoryId: row.category_id,
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

export function toProductCards(
  rows: ProductListRow[],
  offers: Map<string, OfferLike[]> = new Map(),
): PublicProductCard[] {
  return inStockFirst(rows.map((row) => toProductCard(row, offers.get(row.id))));
}

export function filterByCategory(
  products: PublicProductCard[],
  categoryId: string,
): PublicProductCard[] {
  return products.filter((product) => product.categoryId === categoryId);
}

export const getCatalogProductRows = cache(
  async (businessId: string): Promise<ProductListRow[]> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("product")
      .select(CARD_COLUMNS)
      .eq("business_id", businessId)
      .eq("available", true)
      .order("created_at", { ascending: false })
      .returns<ProductListRow[]>();

    if (error) {
      throw error;
    }

    return data ?? [];
  },
);

const getAllPublicProducts = cache(
  async (businessId: string): Promise<PublicProductCard[]> => {
    const [rows, offers] = await Promise.all([
      getCatalogProductRows(businessId),
      getActiveOffers(businessId),
    ]);
    return toProductCards(rows, offersByProduct(offers));
  },
);

/**
 * Productos disponibles (`available = true`) de un negocio, opcionalmente
 * filtrados por categoría. Usada tanto por el home como por la página de
 * categoría, para no duplicar la query entre ambas.
 */
export async function getPublicProducts(
  businessId: string,
  categoryId?: string,
): Promise<PublicProductCard[]> {
  const products = await getAllPublicProducts(businessId);
  return categoryId ? filterByCategory(products, categoryId) : products;
}

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

    const supabase = createPublicClient({ cached: false });

    const [{ data, error }, offers] = await Promise.all([
      supabase
        .from("product")
        .select(CARD_COLUMNS)
        .eq("business_id", businessId)
        .eq("available", true)
        .ilike("name", `%${trimmedQuery}%`)
        .order("created_at", { ascending: false })
        .returns<ProductListRow[]>(),
      getActiveOffers(businessId),
    ]);

    if (error) {
      throw error;
    }

    return toProductCards(data ?? [], offersByProduct(offers));
  },
);

export function toProductDetail(
  row: ProductDetailRow,
  offers: OfferLike[] = [],
): PublicProductDetail {
  const byPosition = <T extends { position: number }>(items: T[]) =>
    [...items].sort((a, b) => a.position - b.position);
  const allSizes = byPosition(row.product_size);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    material: row.material,
    category: row.category,
    ...priceNow(row.price, offers),
    images: byPosition(row.product_image).map(({ id, url, position }) => ({
      id,
      url,
      position,
    })),
    sizes: allSizes
      .filter((size) => size.available)
      .map((size) => ({
        id: size.id,
        label: size.label,
        position: size.position,
        inStock: size.in_stock,
      })),
    inStock: isPublicProductPurchasable({
      inStock: row.in_stock,
      sizes: allSizes.map((size) => ({
        available: size.available,
        inStock: size.in_stock,
      })),
    }),
  };
}

const getProductDetailRow = cache(
  async (businessId: string, slug: string): Promise<ProductDetailRow | null> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("product")
      .select(
        "id, name, slug, description, price, material, in_stock, category(name, slug), product_image(id, url, position), product_size(id, label, position, available, in_stock)",
      )
      .eq("business_id", businessId)
      .eq("slug", slug)
      .eq("available", true)
      .maybeSingle<ProductDetailRow>();

    if (error) {
      throw error;
    }

    return data;
  },
);

/** Resuelve por business_id + slug, nunca por nombre. */
export const getPublicProduct = cache(
  async (
    businessId: string,
    slug: string,
  ): Promise<PublicProductDetail | null> => {
    const [row, offers] = await Promise.all([
      getProductDetailRow(businessId, slug),
      getActiveOffers(businessId),
    ]);

    return row ? toProductDetail(row, offersByProduct(offers).get(row.id)) : null;
  },
);
