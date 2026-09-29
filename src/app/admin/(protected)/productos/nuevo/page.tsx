import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/actions/products";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Nuevo producto",
};

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
    <>
      <PageHeader
        title="Nuevo producto"
        description="Al crearlo vas a poder cargarle fotos y talles."
      />

      <ProductForm
        action={createProduct}
        categories={categories ?? []}
        submitLabel="Crear y continuar"
        pendingLabel="Creando..."
      />
    </>
  );
}
