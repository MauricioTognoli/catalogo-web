"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import {
  applySectionInput,
  clearSlotImage,
  hasUnpublishedChanges,
  isImageSlot,
  isOwnedImagePath,
  normalizeStorefrontConfig,
  parseSectionInput,
  referencedIds,
  setSlotImage,
  storefrontFolder,
  unreferencedImagePaths,
  type StorefrontConfig,
} from "@/lib/storefront/config";
import { STOREFRONT_BUCKET } from "@/lib/storefront/queries";

export type StorefrontActionState = { error: string | null };

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, igual que el bucket
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type StorefrontRow = { draft: StorefrontConfig; published: StorefrontConfig };

/** Lee la portada del negocio, creando la fila con valores iniciales si falta. */
async function loadStorefront(
  supabase: SupabaseClient,
  businessId: string,
): Promise<StorefrontRow | null> {
  const { data, error } = await supabase
    .from("storefront")
    .select("draft, published")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    // Negocio creado después de la migración. published_at queda null: la
    // tienda ya mostraba estos mismos valores iniciales.
    const { error: insertError } = await supabase
      .from("storefront")
      .insert({ business_id: businessId });
    if (insertError && insertError.code !== "23505") return null;
    return {
      draft: normalizeStorefrontConfig(null),
      published: normalizeStorefrontConfig(null),
    };
  }

  return {
    draft: normalizeStorefrontConfig(data.draft),
    published: normalizeStorefrontConfig(data.published),
  };
}

/**
 * Borra de Storage las imágenes que dejó de usar la portada. Solo toca
 * archivos de la carpeta del negocio y nunca uno que siga en el borrador
 * o en lo publicado. Best-effort: si falla, queda un archivo huérfano.
 */
async function removeUnusedImages(
  supabase: SupabaseClient,
  businessId: string,
  candidates: StorefrontConfig | string[],
  stillInUse: StorefrontConfig[],
) {
  const paths = unreferencedImagePaths(candidates, stillInUse).filter((path) =>
    isOwnedImagePath(path, businessId),
  );
  if (paths.length > 0) {
    await supabase.storage.from(STOREFRONT_BUCKET).remove(paths);
  }
}

function revalidateAdmin() {
  revalidatePath("/admin/portada");
}

async function requireBusiness() {
  const business = await getCurrentBusiness();
  if (!business) return null;
  return business;
}

const NO_BUSINESS = { error: "Necesitás configurar tu negocio antes de editar la portada." };
const LOAD_ERROR = { error: "No se pudo leer la portada. Probá de nuevo." };
const SAVE_ERROR = { error: "No se pudieron guardar los cambios. Probá de nuevo." };

/**
 * Guarda los textos, destinos y orden de una sección en el BORRADOR. La
 * tienda no cambia hasta publicar.
 */
export async function saveStorefrontSection(
  rawInput: unknown,
): Promise<StorefrontActionState> {
  const business = await requireBusiness();
  if (!business) return NO_BUSINESS;

  const parsed = parseSectionInput(rawInput);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();

  // Los destinos y destacados tienen que ser del propio negocio: un id
  // ajeno o inexistente se rechaza en vez de guardarse "roto".
  const { categoryIds, productIds } = referencedIds(parsed.value);
  if (categoryIds.length > 0) {
    const { data, error } = await supabase
      .from("category")
      .select("id")
      .eq("business_id", business.id)
      .in("id", categoryIds);
    if (error) return SAVE_ERROR;
    if ((data ?? []).length !== new Set(categoryIds).size) {
      return { error: "La categoría elegida ya no existe." };
    }
  }
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from("product")
      .select("id")
      .eq("business_id", business.id)
      .in("id", productIds);
    if (error) return SAVE_ERROR;
    if ((data ?? []).length !== new Set(productIds).size) {
      return { error: "Alguno de los productos elegidos ya no existe." };
    }
  }

  const row = await loadStorefront(supabase, business.id);
  if (!row) return LOAD_ERROR;

  const applied = applySectionInput(row.draft, parsed.value);
  if (!applied.ok) return { error: applied.error };

  const { error } = await supabase
    .from("storefront")
    .update({ draft: applied.value })
    .eq("business_id", business.id);
  if (error) return SAVE_ERROR;

  revalidateAdmin();
  return { error: null };
}

/**
 * Sube una imagen y la asigna a un lugar del borrador. El path lo decide
 * el servidor ({business_id}/storefront/{uuid}.{ext}); el cliente solo
 * elige el lugar. La imagen reemplazada se borra si ya nadie la usa.
 */
export async function uploadStorefrontImage(
  formData: FormData,
): Promise<StorefrontActionState & { url?: string }> {
  const business = await requireBusiness();
  if (!business) return NO_BUSINESS;

  const slot = formData.get("slot");
  if (!isImageSlot(slot)) return { error: "Lugar de imagen inválido." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo inválido." };
  }
  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) return { error: "Formato no permitido. Usá JPG, PNG o WEBP." };
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { error: "La imagen no puede superar los 5 MB." };
  }

  const supabase = await createClient();
  const row = await loadStorefront(supabase, business.id);
  if (!row) return LOAD_ERROR;

  const imageId = crypto.randomUUID();
  const path = `${storefrontFolder(business.id)}${imageId}.${extension}`;

  // Se valida el lugar ANTES de subir (ej: galería llena, falta el alt).
  const assigned = setSlotImage(row.draft, slot, path, {
    id: imageId,
    alt: String(formData.get("alt") ?? ""),
  });
  if (!assigned.ok) return { error: assigned.error };

  const { error: uploadError } = await supabase.storage
    .from(STOREFRONT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "No se pudo subir la imagen. Probá de nuevo." };

  const { error: updateError } = await supabase
    .from("storefront")
    .update({ draft: assigned.value.config })
    .eq("business_id", business.id);

  if (updateError) {
    // No dejamos el archivo huérfano si no quedó referenciado.
    await supabase.storage.from(STOREFRONT_BUCKET).remove([path]);
    return SAVE_ERROR;
  }

  if (assigned.value.replaced) {
    await removeUnusedImages(supabase, business.id, [assigned.value.replaced], [
      assigned.value.config,
      row.published,
    ]);
  }

  revalidateAdmin();
  return { error: null };
}

/** Quita una imagen del borrador (firma de useActionState para confirmar). */
export async function removeStorefrontImage(
  _prevState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const business = await requireBusiness();
  if (!business) return NO_BUSINESS;

  const slot = formData.get("slot");
  if (!isImageSlot(slot)) return { error: "Lugar de imagen inválido." };
  const imageId = String(formData.get("imageId") ?? "") || undefined;

  const supabase = await createClient();
  const row = await loadStorefront(supabase, business.id);
  if (!row) return LOAD_ERROR;

  const cleared = clearSlotImage(row.draft, slot, imageId);
  if (!cleared.ok) return { error: cleared.error };

  const { error } = await supabase
    .from("storefront")
    .update({ draft: cleared.value.config })
    .eq("business_id", business.id);
  if (error) return SAVE_ERROR;

  // Si la imagen sigue publicada no se borra: la tienda la usa hasta que
  // se publique el cambio.
  if (cleared.value.removed) {
    await removeUnusedImages(supabase, business.id, [cleared.value.removed], [
      cleared.value.config,
      row.published,
    ]);
  }

  revalidateAdmin();
  return { error: null };
}

/** Publica el borrador: la tienda pasa a mostrarlo. */
export async function publishStorefront(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: StorefrontActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<StorefrontActionState> {
  const business = await requireBusiness();
  if (!business) return NO_BUSINESS;

  const supabase = await createClient();
  const row = await loadStorefront(supabase, business.id);
  if (!row) return LOAD_ERROR;

  if (!hasUnpublishedChanges(row.draft, row.published)) {
    return { error: "No hay cambios para publicar." };
  }

  const { error } = await supabase
    .from("storefront")
    .update({ published: row.draft, published_at: new Date().toISOString() })
    .eq("business_id", business.id);
  if (error) return { error: "No se pudo publicar. Probá de nuevo." };

  // Imágenes que solo usaba la versión anterior.
  await removeUnusedImages(supabase, business.id, row.published, [row.draft]);

  revalidateAdmin();
  revalidatePath("/", "layout");
  return { error: null };
}

/** Descarta el borrador y vuelve a lo publicado. */
export async function discardStorefrontDraft(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: StorefrontActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<StorefrontActionState> {
  const business = await requireBusiness();
  if (!business) return NO_BUSINESS;

  const supabase = await createClient();
  const row = await loadStorefront(supabase, business.id);
  if (!row) return LOAD_ERROR;

  const { error } = await supabase
    .from("storefront")
    .update({ draft: row.published })
    .eq("business_id", business.id);
  if (error) return { error: "No se pudieron descartar los cambios. Probá de nuevo." };

  // Imágenes que solo usaba el borrador descartado.
  await removeUnusedImages(supabase, business.id, row.draft, [row.published]);

  revalidateAdmin();
  return { error: null };
}
