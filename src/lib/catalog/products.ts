import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  mainImageUrl: string | null;
  hasAvailableSizes: boolean;
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
};

export type PublicProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  material: string | null;
  images: PublicProductImage[];
  sizes: PublicProductSize[];
};

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  product_image: { url: string; position: number }[];
  product_size: { available: boolean }[];
};

function toProductCard(row: ProductListRow): PublicProductCard {
  const mainImage = [...row.product_image].sort(
    (a, b) => a.position - b.position,
  )[0];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    material: row.material,
    mainImageUrl: mainImage?.url ?? null,
    // La RLS pública de product_size ya filtra por available = true, así
    // que cualquier fila embebida aquí ya es disponible; el .some()
    // queda como chequeo explícito por si esa policy cambia más adelante.
    hasAvailableSizes: row.product_size.some((size) => size.available),
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
        "id, name, slug, price, material, product_image(url, position), product_size(available)",
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

    return (data ?? []).map(toProductCard);
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
      .select("id, name, slug, description, price, material")
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
      supabase
        .from("product_size")
        .select("id, label, position")
        .eq("product_id", product.id)
        .eq("available", true)
        .order("position", { ascending: true }),
    ]);

    if (imagesError || sizesError) {
      throw imagesError ?? sizesError;
    }

    return {
      ...product,
      images: images ?? [],
      sizes: sizes ?? [],
    };
  },
);
