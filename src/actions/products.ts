"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slugify";
import {
  PRODUCT_IMAGES_BUCKET,
  parseProductIds,
  productImagePaths,
  runBulkDelete,
  type BulkDeleteResult,
} from "@/lib/admin/bulk-delete";
import { parseStockInput } from "@/lib/stock/availability";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_MATERIAL_LENGTH = 120;

export type ProductActionState = {
  error: string | null;
};

type ParsedProductInput = {
  name: string;
  description: string | null;
  price: number;
  material: string | null;
  available: boolean;
  categoryId: string | null;
};

type ParseResult =
  | { ok: true; value: ParsedProductInput }
  | { ok: false; error: string };

function parseProductInput(formData: FormData): ParseResult {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "El nombre debe tener entre 2 y 120 caracteres." };
  }

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  if (descriptionRaw.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    };
  }
  const description = descriptionRaw === "" ? null : descriptionRaw;

  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = Number(priceRaw);
  if (priceRaw === "" || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "El precio debe ser un número mayor o igual a 0." };
  }

  const materialRaw = String(formData.get("material") ?? "").trim();
  if (materialRaw.length > MAX_MATERIAL_LENGTH) {
    return {
      ok: false,
      error: `El material no puede superar los ${MAX_MATERIAL_LENGTH} caracteres.`,
    };
  }
  const material = materialRaw === "" ? null : materialRaw;

  // El checkbox solo viaja en el FormData cuando está tildado.
  const available = formData.get("available") !== null;

  const categoryIdRaw = String(formData.get("category_id") ?? "").trim();
  const categoryId = categoryIdRaw === "" ? null : categoryIdRaw;

  return {
    ok: true,
    value: { name, description, price, material, available, categoryId },
  };
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de crear productos.",
    };
  }

  const parsed = parseProductInput(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { name, description, price, material, available, categoryId } =
    parsed.value;

  // Un producto nuevo todavía no tiene talles: el stock es del producto.
  const stock = parseStockInput(formData.get("stock"));
  if (!stock.ok) {
    return { error: stock.error };
  }

  const slug = slugify(name);
  if (!slug) {
    return { error: "El nombre debe incluir al menos una letra o número." };
  }

  const supabase = await createClient();

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("category")
      .select("id")
      .eq("id", categoryId)
      .eq("business_id", business.id)
      .maybeSingle();

    if (categoryError) {
      return { error: "No se pudo verificar la categoría. Probá de nuevo." };
    }

    if (!category) {
      return { error: "La categoría seleccionada no pertenece a tu negocio." };
    }
  }

  const { data: createdProduct, error: insertError } = await supabase
    .from("product")
    .insert({
      business_id: business.id,
      category_id: categoryId,
      name,
      slug,
      description,
      price,
      material,
      available,
      stock: stock.value,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: `Ya existe un producto con el slug "${slug}". Cambiá el nombre para generar uno distinto.`,
      };
    }
    return { error: "No se pudo crear el producto. Probá de nuevo." };
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  // Se continúa en la edición: ahí se cargan imágenes y talles, que
  // requieren que el producto ya exista.
  redirect(`/admin/productos/${createdProduct.id}?creado=1`);
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de editar productos.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return { error: "Producto inválido." };
  }

  const parsed = parseProductInput(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { name, description, price, material, available, categoryId } =
    parsed.value;

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    return {
      error:
        "El slug solo puede tener minúsculas, números y guiones (ej: anillo-solitario).",
    };
  }

  const supabase = await createClient();

  // Confirmamos pertenencia al negocio actual antes de tocar nada. La RLS
  // ya lo exige; esto da un mensaje claro en vez de "0 filas afectadas".
  const { data: existingProduct, error: fetchError } = await supabase
    .from("product")
    .select("id, product_size(id)")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!existingProduct) {
    return { error: "El producto no existe o no te pertenece." };
  }

  // Con talles, el stock se gestiona por talle: se ignora el campo. Sin
  // talles es obligatorio (así los productos migrados con stock "sin
  // cargar" reciben una cantidad real la próxima vez que se guardan).
  const managedBySize = (existingProduct.product_size as unknown[]).length > 0;
  let stockUpdate: { stock: number } | Record<string, never> = {};
  if (!managedBySize) {
    const stock = parseStockInput(formData.get("stock"));
    if (!stock.ok) {
      return { error: stock.error };
    }
    stockUpdate = { stock: stock.value };
  }

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("category")
      .select("id")
      .eq("id", categoryId)
      .eq("business_id", business.id)
      .maybeSingle();

    if (categoryError) {
      return { error: "No se pudo verificar la categoría. Probá de nuevo." };
    }

    if (!category) {
      return { error: "La categoría seleccionada no pertenece a tu negocio." };
    }
  }

  const { error: updateError } = await supabase
    .from("product")
    .update({
      name,
      slug,
      description,
      price,
      material,
      available,
      category_id: categoryId,
      ...stockUpdate,
    })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        error: `Ya existe otro producto con el slug "${slug}" en tu negocio.`,
      };
    }
    return { error: "No se pudo actualizar el producto. Probá de nuevo." };
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/productos/${productId}`);
  return { error: null };
}

export async function toggleProductAvailability(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de modificar productos.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const available = String(formData.get("available") ?? "") === "true";

  if (!productId) {
    return { error: "Producto inválido." };
  }

  const supabase = await createClient();

  const { data: existingProduct, error: fetchError } = await supabase
    .from("product")
    .select("id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!existingProduct) {
    return { error: "El producto no existe o no te pertenece." };
  }

  const { error: updateError } = await supabase
    .from("product")
    .update({ available })
    .eq("id", productId)
    .eq("business_id", business.id);

  if (updateError) {
    return { error: "No se pudo actualizar la disponibilidad. Probá de nuevo." };
  }

  revalidatePath("/admin/productos");
  return { error: null };
}

export type DeleteProductsState = {
  error: string | null;
  deletedIds: string[];
  failed: BulkDeleteResult["failed"];
};

export async function deleteProducts(
  productIds: unknown,
): Promise<DeleteProductsState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de eliminar productos.",
      deletedIds: [],
      failed: [],
    };
  }

  const parsed = parseProductIds(productIds);
  if (!parsed.ok) {
    return { error: parsed.error, deletedIds: [], failed: [] };
  }

  const supabase = await createClient();

  const outcome = await runBulkDelete(parsed.value, {
    loadOwned: async (ids) => {
      const { data, error } = await supabase
        .from("product")
        .select("id, product_image(url)")
        .eq("business_id", business.id)
        .in("id", ids)
        .returns<{ id: string; product_image: { url: string }[] }[]>();
      if (error) return null;
      return data.map((product) => ({
        id: product.id,
        imageUrls: product.product_image.map((image) => image.url),
      }));
    },
    deleteOne: async (id) => {
      const { data, error } = await supabase
        .from("product")
        .delete()
        .eq("id", id)
        .eq("business_id", business.id)
        .select("id");
      return !error && data.length === 1;
    },
    removeImages: async (paths) => {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
    },
  });

  if (!outcome.ok) {
    return { error: outcome.error, deletedIds: [], failed: [] };
  }

  if (outcome.value.deletedIds.length > 0) {
    revalidatePath("/admin/productos");
    revalidatePath("/admin/dashboard");
  }

  return { error: null, ...outcome.value };
}

export async function deleteProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return {
      error: "Necesitás configurar tu negocio antes de eliminar productos.",
    };
  }

  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    return { error: "Producto inválido." };
  }

  const supabase = await createClient();

  const { data: existingProduct, error: fetchError } = await supabase
    .from("product")
    .select("id, product_image(url)")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!existingProduct) {
    return { error: "El producto no existe o no te pertenece." };
  }

  // product_image y product_size tienen ON DELETE CASCADE: al borrar el
  // producto se borran sus filas. Los archivos de Storage no, por eso se
  // resuelven sus paths antes del delete.
  const imagePaths = productImagePaths(
    (existingProduct.product_image as { url: string }[]).map((image) => image.url),
  );

  const { error: deleteError } = await supabase
    .from("product")
    .delete()
    .eq("id", productId)
    .eq("business_id", business.id);

  if (deleteError) {
    return { error: "No se pudo eliminar el producto. Probá de nuevo." };
  }

  if (imagePaths.length > 0) {
    // Best-effort: el producto ya no existe; si esto falla solo quedan
    // archivos huérfanos en Storage, nada visible.
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(imagePaths);
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  return { error: null };
}
