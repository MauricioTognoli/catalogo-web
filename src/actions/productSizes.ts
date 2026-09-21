"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";

const MAX_LABEL_LENGTH = 30;

export type ProductSizeActionState = {
  error: string | null;
};

export async function createProductSize(
  _prevState: ProductSizeActionState,
  formData: FormData,
): Promise<ProductSizeActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return { error: "Necesitás configurar tu negocio antes de crear talles." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return { error: "Producto inválido." };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
    return {
      error: `El talle debe tener entre 1 y ${MAX_LABEL_LENGTH} caracteres.`,
    };
  }

  const available = formData.get("available") !== null;

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

  // Posición automática: al final de los talles actuales del producto.
  const { data: lastSize, error: lastSizeError } = await supabase
    .from("product_size")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSizeError) {
    return { error: "No se pudo calcular la posición. Probá de nuevo." };
  }

  const position = lastSize ? lastSize.position + 1 : 0;

  const { error: insertError } = await supabase.from("product_size").insert({
    product_id: productId,
    label,
    available,
    position,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: `Ya existe un talle "${label}" para este producto.` };
    }
    return { error: "No se pudo crear el talle. Probá de nuevo." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function updateProductSize(
  _prevState: ProductSizeActionState,
  formData: FormData,
): Promise<ProductSizeActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return { error: "Necesitás configurar tu negocio antes de editar talles." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const sizeId = String(formData.get("sizeId") ?? "").trim();
  if (!productId || !sizeId) {
    return { error: "Talle inválido." };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
    return {
      error: `El talle debe tener entre 1 y ${MAX_LABEL_LENGTH} caracteres.`,
    };
  }

  const available = formData.get("available") !== null;

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

  const { data: size, error: sizeError } = await supabase
    .from("product_size")
    .select("id")
    .eq("id", sizeId)
    .eq("product_id", productId)
    .maybeSingle();

  if (sizeError) {
    return { error: "No se pudo verificar el talle. Probá de nuevo." };
  }

  if (!size) {
    return { error: "El talle no existe o no pertenece a este producto." };
  }

  const { error: updateError } = await supabase
    .from("product_size")
    .update({ label, available })
    .eq("id", sizeId)
    .eq("product_id", productId);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: `Ya existe un talle "${label}" para este producto.` };
    }
    return { error: "No se pudo actualizar el talle. Probá de nuevo." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function toggleProductSizeAvailability(
  _prevState: ProductSizeActionState,
  formData: FormData,
): Promise<ProductSizeActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de modificar talles.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const sizeId = String(formData.get("sizeId") ?? "").trim();
  const available = String(formData.get("available") ?? "") === "true";

  if (!productId || !sizeId) {
    return { error: "Talle inválido." };
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

  const { data: size, error: sizeError } = await supabase
    .from("product_size")
    .select("id")
    .eq("id", sizeId)
    .eq("product_id", productId)
    .maybeSingle();

  if (sizeError) {
    return { error: "No se pudo verificar el talle. Probá de nuevo." };
  }

  if (!size) {
    return { error: "El talle no existe o no pertenece a este producto." };
  }

  const { error: updateError } = await supabase
    .from("product_size")
    .update({ available })
    .eq("id", sizeId)
    .eq("product_id", productId);

  if (updateError) {
    return {
      error: "No se pudo actualizar la disponibilidad. Probá de nuevo.",
    };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function deleteProductSize(
  _prevState: ProductSizeActionState,
  formData: FormData,
): Promise<ProductSizeActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de eliminar talles.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const sizeId = String(formData.get("sizeId") ?? "").trim();
  if (!productId || !sizeId) {
    return { error: "Talle inválido." };
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

  const { data: size, error: sizeError } = await supabase
    .from("product_size")
    .select("id")
    .eq("id", sizeId)
    .eq("product_id", productId)
    .maybeSingle();

  if (sizeError) {
    return { error: "No se pudo verificar el talle. Probá de nuevo." };
  }

  if (!size) {
    return { error: "El talle no existe o ya fue eliminado." };
  }

  const { error: deleteError } = await supabase
    .from("product_size")
    .delete()
    .eq("id", sizeId)
    .eq("product_id", productId);

  if (deleteError) {
    return { error: "No se pudo eliminar el talle. Probá de nuevo." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function reorderProductSizes(
  productId: string,
  orderedSizeIds: string[],
): Promise<ProductSizeActionState> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de reordenar talles.",
    };
  }

  if (!productId || orderedSizeIds.length === 0) {
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

  // Confirmamos que el set de ids recibido coincide exactamente con los
  // talles reales del producto, mismo criterio que reorderProductImages.
  const { data: existingSizes, error: existingSizesError } = await supabase
    .from("product_size")
    .select("id")
    .eq("product_id", productId);

  if (existingSizesError) {
    return { error: "No se pudo verificar los talles. Probá de nuevo." };
  }

  const existingIds = new Set((existingSizes ?? []).map((size) => size.id));
  const isValidSet =
    orderedSizeIds.length === existingIds.size &&
    orderedSizeIds.every((id) => existingIds.has(id));

  if (!isValidSet) {
    return {
      error: "El orden recibido no coincide con los talles del producto.",
    };
  }

  const results = await Promise.all(
    orderedSizeIds.map((id, index) =>
      supabase
        .from("product_size")
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
