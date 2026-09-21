import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/actions/products";
import { ProductForm } from "../product-form";
import { ProductImages } from "../product-images";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getCurrentBusiness();

  if (!business) {
    redirect("/admin/configuracion");
  }

  const supabase = await createClient();

  const [
    { data: product, error: productError },
    { data: categories, error: categoriesError },
    { data: images, error: imagesError },
  ] = await Promise.all([
    supabase
      .from("product")
      .select(
        "id, name, slug, description, price, material, available, category_id",
      )
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("category")
      .select("id, name")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase
      .from("product_image")
      .select("id, url, position")
      .eq("product_id", id)
      .order("position", { ascending: true }),
  ]);

  if (productError || categoriesError || imagesError) {
    throw productError ?? categoriesError ?? imagesError;
  }

  if (!product) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Producto no encontrado</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          El producto que buscás no existe o no pertenece a tu negocio.
        </p>
        <Link
          href="/admin/productos"
          className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Volver al listado
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Editar producto</h1>
        <Link
          href="/admin/productos"
          className="text-sm text-zinc-500 hover:underline"
        >
          Volver al listado
        </Link>
      </div>

      <ProductForm
        action={updateProduct}
        categories={categories ?? []}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando..."
        showSlugField
        defaultValues={{
          productId: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          material: product.material,
          available: product.available,
          categoryId: product.category_id,
        }}
      />

      <ProductImages productId={product.id} images={images ?? []} />
    </main>
  );
}
