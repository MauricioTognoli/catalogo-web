import { createClient } from "@/lib/supabase/server";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Devuelve el negocio del usuario autenticado, o null si no hay sesión
 * o si todavía no configuró ninguno. Usa el cliente Supabase estándar
 * (no service role): el filtro por owner_id es explícito y además queda
 * respaldado por la policy de RLS `business_select_own`.
 */
export async function getCurrentBusiness(): Promise<Business | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
