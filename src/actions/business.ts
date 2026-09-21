"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { getStoragePathFromPublicUrl } from "@/lib/storage/getStoragePathFromPublicUrl";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const WHATSAPP_PATTERN = /^\d{6,15}$/;
const BUSINESS_ASSETS_BUCKET = "business-assets";
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const LOGO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type CreateBusinessState = {
  error: string | null;
};

export async function createBusiness(
  _prevState: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debés iniciar sesión para continuar." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const whatsappNumber = String(formData.get("whatsapp_number") ?? "").trim();
  const logoUrlRaw = formData.get("logo_url");
  const logoUrl =
    typeof logoUrlRaw === "string" && logoUrlRaw.trim() !== ""
      ? logoUrlRaw.trim()
      : null;

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      error:
        "El slug solo puede tener minúsculas, números y guiones (ej: mi-negocio).",
    };
  }

  if (!WHATSAPP_PATTERN.test(whatsappNumber)) {
    return {
      error:
        "El WhatsApp debe tener solo números, con código de país (ej: 5491122334455).",
    };
  }

  // El owner_id nunca sale del formulario: siempre del usuario autenticado
  // en el servidor. Un valor manipulado en el cliente no tendría efecto,
  // porque ni se lee de formData ni la policy business_insert_own lo permitiría.
  const { data: existingBusiness, error: existingBusinessError } =
    await supabase
      .from("business")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

  if (existingBusinessError) {
    return {
      error: "No se pudo verificar si ya tenés un negocio. Probá de nuevo.",
    };
  }

  if (existingBusiness) {
    return { error: "Ya tenés un negocio creado." };
  }

  const { error: insertError } = await supabase.from("business").insert({
    owner_id: user.id,
    name,
    slug,
    whatsapp_number: whatsappNumber,
    logo_url: logoUrl,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Ese slug ya está en uso. Elegí otro." };
    }
    return { error: "No se pudo crear el negocio. Probá de nuevo." };
  }

  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}

export type UpdateBusinessState = {
  error: string | null;
};

export async function updateBusiness(
  _prevState: UpdateBusinessState,
  formData: FormData,
): Promise<UpdateBusinessState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return { error: "No se encontró tu negocio." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsapp_number") ?? "").trim();

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }

  if (!WHATSAPP_PATTERN.test(whatsappNumber)) {
    return {
      error:
        "El WhatsApp debe tener solo números, con código de país (ej: 5491122334455).",
    };
  }

  const supabase = await createClient();

  // business.id salió de getCurrentBusiness(), que ya lo resolvió
  // filtrando por owner_id = auth.uid(): no hace falta un chequeo extra
  // de pertenencia como en product/category, porque acá no hay ningún id
  // recibido desde el cliente para verificar.
  const { error: updateError } = await supabase
    .from("business")
    .update({ name, whatsapp_number: whatsappNumber })
    .eq("id", business.id);

  if (updateError) {
    return { error: "No se pudo actualizar el negocio. Probá de nuevo." };
  }

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export type BusinessLogoActionState = {
  error: string | null;
};

export async function uploadBusinessLogo(
  _prevState: BusinessLogoActionState,
  formData: FormData,
): Promise<BusinessLogoActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return { error: "No se encontró tu negocio." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo inválido." };
  }

  const extension = LOGO_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return { error: "Formato no permitido. Usá JPG, PNG o WEBP." };
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return { error: "El archivo no puede superar los 5 MB." };
  }

  const supabase = await createClient();

  // Path derivado server-side: {business_id}/logo/{uuid}.{ext}. El
  // cliente nunca decide dónde se guarda el archivo.
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const path = `${business.id}/logo/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUSINESS_ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "No se pudo subir el logo. Probá de nuevo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUSINESS_ASSETS_BUCKET).getPublicUrl(path);

  const previousLogoUrl = business.logo_url;

  const { error: updateError } = await supabase
    .from("business")
    .update({ logo_url: publicUrl })
    .eq("id", business.id);

  if (updateError) {
    // No dejamos el archivo huérfano si no pudimos referenciarlo.
    await supabase.storage.from(BUSINESS_ASSETS_BUCKET).remove([path]);
    return { error: "No se pudo guardar el logo. Probá de nuevo." };
  }

  // El logo anterior se borra recién ahora, después de confirmar que el
  // nuevo quedó correctamente referenciado en business.logo_url.
  if (previousLogoUrl) {
    const previousPath = getStoragePathFromPublicUrl(
      previousLogoUrl,
      BUSINESS_ASSETS_BUCKET,
    );
    if (previousPath) {
      // Best-effort: si esto falla, el negocio ya muestra el logo nuevo
      // igual; solo queda un archivo huérfano en Storage.
      await supabase.storage.from(BUSINESS_ASSETS_BUCKET).remove([previousPath]);
    }
  }

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/dashboard");
  return { error: null };
}

// Firma requerida por useActionState; no necesita datos del formulario
// porque el negocio se resuelve enteramente server-side.
export async function deleteBusinessLogo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: BusinessLogoActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<BusinessLogoActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return { error: "No se encontró tu negocio." };
  }

  if (!business.logo_url) {
    // Ya no hay logo: no es un error, no hay nada que hacer.
    return { error: null };
  }

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("business")
    .update({ logo_url: null })
    .eq("id", business.id);

  if (updateError) {
    return { error: "No se pudo eliminar el logo. Probá de nuevo." };
  }

  const path = getStoragePathFromPublicUrl(
    business.logo_url,
    BUSINESS_ASSETS_BUCKET,
  );

  if (path) {
    // Best-effort: la referencia en business.logo_url ya se limpió (lo
    // que ve la UI), así que si esto falla no queda un logo roto visible.
    await supabase.storage.from(BUSINESS_ASSETS_BUCKET).remove([path]);
  }

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/dashboard");
  return { error: null };
}
