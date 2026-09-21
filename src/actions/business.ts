"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const WHATSAPP_PATTERN = /^\d{6,15}$/;

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
