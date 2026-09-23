import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/actions/products";
import { ProductForm } from "../product-form";

export default async function NuevoProductoPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    redirect("/admin/configuracion");
  }

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("category")
    .select("id, name")
    .eq("business_id", business.id)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo producto</h1>
        <Link
          href="/admin/productos"
          className="text-sm text-zinc-500 hover:underline"
        >
          Volver al listado
        </Link>
      </div>

      <ProductForm
        action={createProduct}
        categories={categories ?? []}
        submitLabel="Crear producto"
        pendingLabel="Creando..."
      />
    </main>
  );
}
