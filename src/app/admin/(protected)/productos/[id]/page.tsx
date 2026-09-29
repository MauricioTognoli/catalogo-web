import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, SearchX } from "lucide-react";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ProductForm } from "../product-form";
import { ProductImages } from "../product-images";
import { ProductSizes } from "../product-sizes";
import { DeleteProductButton } from "./delete-product-button";
import { CreatedToast } from "./created-toast";

export const metadata: Metadata = {
  title: "Editar producto",
};

export default async function EditarProductoPage({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const business = await getCurrentBusiness();

  if (!business) {
    redirect("/admin/configuracion");
  }

  const supabase = await createClient();

  const [
    { data: product, error: productError },
    { data: categories, error: categoriesError },
    { data: images, error: imagesError },
    { data: sizes, error: sizesError },
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
    supabase
      .from("product_size")
      .select("id, label, available, position")
      .eq("product_id", id)
      .order("position", { ascending: true }),
  ]);

  if (productError || categoriesError || imagesError || sizesError) {
    throw productError ?? categoriesError ?? imagesError ?? sizesError;
  }

  if (!product) {
    return (
      <EmptyState
        icon={SearchX}
        title="Producto no encontrado"
        description="El producto que buscás no existe o fue eliminado."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/productos">Volver a productos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      {creado === "1" && <CreatedToast />}

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{product.name}</span>
            {!product.available && <Badge variant="secondary">Oculto</Badge>}
          </span>
        }
        actions={
          <>
            {product.available && (
              <Button asChild variant="outline">
                <a
                  href={`/productos/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Ver en la tienda
                </a>
              </Button>
            )}
            <DeleteProductButton
              productId={product.id}
              productName={product.name}
            />
          </>
        }
      />

      <ProductForm
        // Remonta el formulario con los valores guardados tras cada
        // revalidación, para que defaultValue refleje lo persistido.
        key={JSON.stringify(product)}
        action={updateProduct}
        categories={categories ?? []}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando..."
        successMessage="Cambios guardados"
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

      <ProductSizes productId={product.id} sizes={sizes ?? []} />
    </>
  );
}
