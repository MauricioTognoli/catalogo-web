import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicCategory = {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  position: number;
};

export const getPublicCategories = cache(
  async (businessId: string): Promise<PublicCategory[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category")
      .select("id, business_id, name, slug, position")
      .eq("business_id", businessId)
      .order("position", { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },
);

/** Resuelve por business_id + slug, nunca por nombre. */
export const getPublicCategory = cache(
  async (businessId: string, slug: string): Promise<PublicCategory | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category")
      .select("id, business_id, name, slug, position")
      .eq("business_id", businessId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },
);
