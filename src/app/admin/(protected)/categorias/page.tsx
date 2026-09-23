import Link from "next/link";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { CreateCategoryForm } from "./create-category-form";
import { CategoryRow } from "./category-row";

export default async function CategoriasPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Necesitás configurar tu negocio antes de crear categorías.
        </p>
        <Link
          href="/admin/configuracion"
          className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Configurar negocio
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("category")
    .select("id, name, slug, position")
    .eq("business_id", business.id)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Organizá los productos de tu catálogo en categorías.
        </p>
      </div>

      <CreateCategoryForm />

      {categories.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Todavía no tenés categorías. Creá la primera con el formulario de
            arriba.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Slug</th>
              <th className="py-2 font-medium">Posición</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
