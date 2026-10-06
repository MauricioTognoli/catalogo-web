import { cache } from "react";
import { draftMode } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  hasUnpublishedChanges,
  normalizeStorefrontConfig,
  type StorefrontConfig,
} from "./config";

export const STOREFRONT_BUCKET = "business-assets";

/** URL pública de una imagen de la portada (bucket público). */
export function storefrontImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${STOREFRONT_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export type AdminStorefront = {
  draft: StorefrontConfig;
  published: StorefrontConfig;
  publishedAt: string | null;
  hasChanges: boolean;
};

/**
 * Portada para el panel (el dueño lee borrador y publicado). Un negocio
 * creado después de la migración todavía no tiene fila: se muestran los
 * valores iniciales y la fila se crea en la primera escritura.
 */
export async function getAdminStorefront(businessId: string): Promise<AdminStorefront> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storefront")
    .select("draft, published, published_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;

  const draft = normalizeStorefrontConfig(data?.draft);
  const published = normalizeStorefrontConfig(data?.published);

  return {
    draft,
    published,
    publishedAt: data?.published_at ?? null,
    hasChanges: hasUnpublishedChanges(draft, published),
  };
}

export type PublicStorefront = {
  config: StorefrontConfig;
  /** Se está mostrando el borrador (vista previa del dueño). */
  isPreview: boolean;
};

/**
 * Solo la versión PUBLICADA, sin importar la vista previa. La usa la
 * metadata (títulos, descripciones, imagen para compartir): un borrador
 * nunca se comparte ni se indexa como si fuera contenido publicado.
 */
export const getPublishedStorefront = cache(
  async (businessId: string): Promise<StorefrontConfig> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("storefront")
      .select("published")
      .eq("business_id", businessId)
      .maybeSingle();

    // Sin fila (negocio nuevo) o error: valores iniciales, así la portada
    // nunca tira abajo la tienda. El error se registra igual.
    if (error) {
      console.error("No se pudo leer la portada publicada", error);
    }
    return normalizeStorefrontConfig(error ? null : data?.published);
  },
);

/**
 * Portada para la tienda. Con la vista previa activa (draftMode, que solo
 * se activa desde el panel) intenta leer el borrador: la RLS y los
 * privilegios de columna garantizan que solo el dueño con sesión pueda
 * hacerlo. Si no puede, cae a la versión publicada.
 */
export const getPublicStorefront = cache(
  async (businessId: string): Promise<PublicStorefront> => {
    const { isEnabled: previewRequested } = await draftMode();

    if (previewRequested) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("storefront")
        .select("draft")
        .eq("business_id", businessId)
        .maybeSingle();

      if (!error && data) {
        return { config: normalizeStorefrontConfig(data.draft), isPreview: true };
      }
    }

    return { config: await getPublishedStorefront(businessId), isPreview: false };
  },
);
