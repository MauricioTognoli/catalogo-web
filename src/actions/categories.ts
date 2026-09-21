"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slugify";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type CategoryActionState = {
  error: string | null;
};

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de crear categorías.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }

  const slug = slugify(name);

  if (!slug) {
    return { error: "El nombre debe incluir al menos una letra o número." };
  }

  const supabase = await createClient();

  // Posición automática: al final de la lista actual del negocio.
  const { data: lastCategory, error: lastCategoryError } = await supabase
    .from("category")
    .select("position")
    .eq("business_id", business.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCategoryError) {
    return { error: "No se pudo calcular la posición. Probá de nuevo." };
  }

  const position = lastCategory ? lastCategory.position + 1 : 0;

  const { error: insertError } = await supabase.from("category").insert({
    business_id: business.id,
    name,
    slug,
    position,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: `Ya existe una categoría con el slug "${slug}". Cambiá el nombre para generar uno distinto.`,
      };
    }
    return { error: "No se pudo crear la categoría. Probá de nuevo." };
  }

  revalidatePath("/admin/categorias");
  return { error: null };
}

export async function updateCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de editar categorías.",
    };
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    return { error: "Categoría inválida." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const position = Number(formData.get("position"));

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      error:
        "El slug solo puede tener minúsculas, números y guiones (ej: anillos-de-oro).",
    };
  }

  if (!Number.isInteger(position) || position < 0) {
    return { error: "La posición debe ser un número entero mayor o igual a 0." };
  }

  const supabase = await createClient();

  // Confirmamos que la categoría pertenece al negocio actual antes de
  // tocarla. La RLS ya lo exige; esto solo da un mensaje claro en vez
  // de un "0 filas afectadas" silencioso.
  const { data: existingCategory, error: fetchError } = await supabase
    .from("category")
    .select("id")
    .eq("id", categoryId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar la categoría. Probá de nuevo." };
  }

  if (!existingCategory) {
    return { error: "La categoría no existe o no te pertenece." };
  }

  const { error: updateError } = await supabase
    .from("category")
    .update({ name, slug, position })
    .eq("id", categoryId)
    .eq("business_id", business.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        error: `Ya existe otra categoría con el slug "${slug}" en tu negocio.`,
      };
    }
    return { error: "No se pudo actualizar la categoría. Probá de nuevo." };
  }

  revalidatePath("/admin/categorias");
  return { error: null };
}

export async function deleteCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de eliminar categorías.",
    };
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    return { error: "Categoría inválida." };
  }

  const supabase = await createClient();

  const { data: existingCategory, error: fetchError } = await supabase
    .from("category")
    .select("id")
    .eq("id", categoryId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar la categoría. Probá de nuevo." };
  }

  if (!existingCategory) {
    return { error: "La categoría no existe o no te pertenece." };
  }

  // product.category_id -> category.id es ON DELETE SET NULL a nivel de
  // schema: los productos de esta categoría quedan sin categoría, no se
  // borran. No hace falta ningún paso extra acá.
  const { error: deleteError } = await supabase
    .from("category")
    .delete()
    .eq("id", categoryId)
    .eq("business_id", business.id);

  if (deleteError) {
    return { error: "No se pudo eliminar la categoría. Probá de nuevo." };
  }

  revalidatePath("/admin/categorias");
  return { error: null };
}
