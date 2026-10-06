"use server";

import { revalidatePath } from "next/cache";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { runProductImport, type ImportDeps, type ImportOutcome } from "@/lib/import/run-import";

/** Tamaño de página al leer categorías. */
const PAGE_SIZE = 1000;
/** Valores por consulta `in (...)`: mantiene la URL de PostgREST acotada. */
const LOOKUP_CHUNK = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Acceso a datos acotado al negocio de la sesión. Todas las consultas
 * usan el cliente con la sesión del usuario, así que la RLS (dueño del
 * negocio, categoría del mismo negocio) aplica igual que en el panel.
 */
async function depsForBusiness(businessId: string): Promise<ImportDeps> {
  const supabase = await createClient();

  return {
    async loadCategories() {
      const categories: { id: string; name: string }[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("category")
          .select("id, name")
          .eq("business_id", businessId)
          .order("id")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        categories.push(...data);
        if (data.length < PAGE_SIZE) return categories;
      }
    },

    // Solo se consultan los slugs y nombres que trae el archivo, en
    // tandas: nunca se lee el catálogo completo.
    async findExisting({ slugs, names }) {
      const found = { slugs: [] as string[], names: [] as string[] };
      const queries = [
        ...chunk(slugs, LOOKUP_CHUNK).map((values) => ({ column: "slug" as const, values })),
        ...chunk(names, LOOKUP_CHUNK).map((values) => ({ column: "name" as const, values })),
      ];
      const results = await Promise.all(
        queries.map(({ column, values }) =>
          supabase
            .from("product")
            .select("slug, name")
            .eq("business_id", businessId)
            .in(column, values),
        ),
      );
      for (const { data, error } of results) {
        if (error) throw error;
        for (const row of data) {
          found.slugs.push(row.slug);
          found.names.push(row.name);
        }
      }
      return found;
    },

    // Un único INSERT con todas las filas: Postgres lo aplica completo o
    // no aplica nada, así que no puede quedar una importación a medias.
    async insertAll(products) {
      const { data, error } = await supabase
        .from("product")
        .insert(
          products.map((product) => ({
            business_id: businessId,
            category_id: product.categoryId,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            material: product.material,
            available: product.available,
            stock: product.stock,
          })),
        )
        .select("id, name");

      if (error) {
        return {
          ok: false,
          error:
            error.code === "23505"
              ? "Mientras importabas se creó otro producto con uno de estos nombres. No se guardó ningún producto: volvé a revisar el archivo."
              : "No se pudo guardar la importación. No se guardó ningún producto: probá de nuevo.",
        };
      }
      return { ok: true, created: data };
    },
  };
}

async function run(formData: FormData, mode: "preview" | "commit"): Promise<ImportOutcome> {
  const business = await getCurrentBusiness();
  if (!business) {
    return {
      kind: "file_error",
      errors: ["Necesitás configurar tu negocio antes de importar productos."],
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { kind: "file_error", errors: ["Elegí un archivo .xlsx."] };
  }

  try {
    const outcome = await runProductImport(
      {
        size: file.size,
        name: file.name,
        bytes: async () => new Uint8Array(await file.arrayBuffer()),
      },
      mode,
      await depsForBusiness(business.id),
    );

    if (outcome.kind === "imported") {
      revalidatePath("/admin/productos");
      revalidatePath("/admin/dashboard");
      revalidateCatalog();
    }
    return outcome;
  } catch {
    return {
      kind: "file_error",
      errors: ["No se pudo revisar el archivo contra tu catálogo. Probá de nuevo."],
    };
  }
}

/** Lee y valida el archivo sin guardar nada. */
export async function previewProductImport(formData: FormData): Promise<ImportOutcome> {
  return run(formData, "preview");
}

/**
 * Vuelve a leer y validar el MISMO archivo (no se confía en la vista
 * previa del navegador) y, si no hay ningún error, guarda todo.
 */
export async function commitProductImport(formData: FormData): Promise<ImportOutcome> {
  return run(formData, "commit");
}
