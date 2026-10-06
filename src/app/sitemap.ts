import type { MetadataRoute } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import { createPublicClient } from "@/lib/supabase/public";
import { getSiteUrl } from "@/lib/seo/site-url";

const PAGE_SIZE = 1000;
/** Máximo de URLs de un sitemap según el protocolo. */
const MAX_URLS = 50_000;

type Row = { slug: string; updated_at: string };

/**
 * Solo contenido publicado: inicio, categorías y productos visibles (la
 * RLS pública ya excluye los ocultos). Se lee paginado, nunca el
 * catálogo entero en una consulta.
 */
async function fetchAll(table: "category" | "product", businessId: string): Promise<Row[]> {
  const supabase = createPublicClient();
  const rows: Row[] = [];

  for (let from = 0; from < MAX_URLS; from += PAGE_SIZE) {
    let query = supabase
      .from(table)
      .select("slug, updated_at")
      .eq("business_id", businessId)
      .order("slug")
      .range(from, from + PAGE_SIZE - 1);
    if (table === "product") query = query.eq("available", true);

    const { data, error } = await query.returns<Row[]>();
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const url = (path: string) => new URL(path, siteUrl).href;
  const business = await getPublicBusiness();

  const home: MetadataRoute.Sitemap[number] = {
    url: url("/"),
    changeFrequency: "daily",
    priority: 1,
  };
  if (!business) return [home];

  const [categories, products] = await Promise.all([
    fetchAll("category", business.id),
    fetchAll("product", business.id),
  ]);

  return [
    home,
    ...categories.map((category) => ({
      url: url(`/categorias/${category.slug}`),
      lastModified: category.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: url(`/productos/${product.slug}`),
      lastModified: product.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ].slice(0, MAX_URLS);
}
