"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ProductImageActionState = {
  error: string | null;
};

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function uploadProductImage(
  formData: FormData,
): Promise<ProductImageActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de subir imágenes.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return { error: "Producto inválido." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo inválido." };
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return { error: "Formato no permitido. Usá JPG, PNG o WEBP." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "El archivo no puede superar los 5 MB." };
  }

  const supabase = await createClient();

  // Verificamos pertenencia del producto ANTES de tocar Storage.
  const { data: product, error: productError } = await supabase
    .from("product")
    .select("id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (productError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!product) {
    return { error: "El producto no existe o no te pertenece." };
  }

  // Nombre único (no el original) para evitar colisiones entre uploads.
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const path = `${business.id}/${productId}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "No se pudo subir la imagen. Probá de nuevo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  const { data: lastImage, error: lastImageError } = await supabase
    .from("product_image")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastImageError) {
    await supabase.storage.from(BUCKET_NAME).remove([path]);
    return { error: "No se pudo guardar la imagen. Probá de nuevo." };
  }

  const position = lastImage ? lastImage.position + 1 : 0;

  const { error: insertError } = await supabase.from("product_image").insert({
    product_id: productId,
    url: publicUrl,
    position,
  });

  if (insertError) {
    // No dejamos el archivo huérfano si no pudimos registrar la fila.
    await supabase.storage.from(BUCKET_NAME).remove([path]);
    return { error: "No se pudo guardar la imagen. Probá de nuevo." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function deleteProductImage(
  _prevState: ProductImageActionState,
  formData: FormData,
): Promise<ProductImageActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de eliminar imágenes.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const imageId = String(formData.get("imageId") ?? "").trim();

  if (!productId || !imageId) {
    return { error: "Imagen inválida." };
  }

  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("product")
    .select("id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (productError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!product) {
    return { error: "El producto no existe o no te pertenece." };
  }

  const { data: image, error: imageError } = await supabase
    .from("product_image")
    .select("id, url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (imageError) {
    return { error: "No se pudo verificar la imagen. Probá de nuevo." };
  }

  if (!image) {
    return { error: "La imagen no existe o ya fue eliminada." };
  }

  const path = getStoragePathFromPublicUrl(image.url);

  const { error: deleteRowError } = await supabase
    .from("product_image")
    .delete()
    .eq("id", imageId);

  if (deleteRowError) {
    return { error: "No se pudo eliminar la imagen. Probá de nuevo." };
  }

  if (path) {
    // Best-effort: la fila ya se borró (lo que ve la UI), así que si esto
    // falla no queda una imagen rota visible, solo un archivo huérfano en
    // Storage.
    await supabase.storage.from(BUCKET_NAME).remove([path]);
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function reorderProductImages(
  productId: string,
  orderedImageIds: string[],
): Promise<ProductImageActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de reordenar imágenes.",
    };
  }

  if (!productId || orderedImageIds.length === 0) {
    return { error: "Nada para reordenar." };
  }

  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("product")
    .select("id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (productError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!product) {
    return { error: "El producto no existe o no te pertenece." };
  }

  // Confirmamos que el set de ids recibido coincide exactamente con las
  // imágenes reales del producto, para no aceptar ids ajenos ni un
  // reordenamiento parcial.
  const { data: existingImages, error: existingImagesError } = await supabase
    .from("product_image")
    .select("id")
    .eq("product_id", productId);

  if (existingImagesError) {
    return { error: "No se pudo verificar las imágenes. Probá de nuevo." };
  }

  const existingIds = new Set((existingImages ?? []).map((image) => image.id));
  const isValidSet =
    orderedImageIds.length === existingIds.size &&
    orderedImageIds.every((id) => existingIds.has(id));

  if (!isValidSet) {
    return {
      error: "El orden recibido no coincide con las imágenes del producto.",
    };
  }

  const results = await Promise.all(
    orderedImageIds.map((id, index) =>
      supabase
        .from("product_image")
        .update({ position: index })
        .eq("id", id)
        .eq("product_id", productId),
    ),
  );

  if (results.some((result) => result.error)) {
    return { error: "No se pudo guardar el nuevo orden. Probá de nuevo." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}
