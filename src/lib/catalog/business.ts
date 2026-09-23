import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
};

/**
 * Resuelve el negocio del catálogo público.
 *
 * Estrategia actual: el proyecto es de un solo negocio, así que se toma
 * el primero creado (orden determinístico, sin hardcodear ningún dato
 * real del negocio). Cuando exista multi-tenant real, esto se reemplaza
 * por resolución por dominio/subdominio o por un slug explícito — ver
 * la decisión completa documentada en el resumen de esta etapa.
 *
 * Envuelta en `cache()` de React para deduplicar la consulta dentro de
 * un mismo request: el layout y cada página la llaman de forma
 * independiente (no hay forma de pasar props de layout a page en el App
 * Router), pero solo pega contra la base una vez por request.
 */
export const getPublicBusiness = cache(
  async (): Promise<PublicBusiness | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("business")
      .select(
        "id, name, slug, logo_url, whatsapp_number, email, address, instagram_url",
      )
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },
);
