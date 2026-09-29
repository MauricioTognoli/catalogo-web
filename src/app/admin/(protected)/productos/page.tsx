import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, PackagePlus } from "lucide-react";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { ALL_CATEGORIES, parseStatusFilter } from "@/lib/admin/product-filters";
import { summarizeStock } from "@/lib/stock/availability";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { BusinessRequired } from "@/components/admin/business-required";
import { ProductsTable, type ProductTableRow } from "./products-table";

export const metadata: Metadata = {
  title: "Productos",
};

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  available: boolean;
  stock: number | null;
  category_id: string | null;
  // category_id es una FK "muchos a uno": PostgREST devuelve un único
  // objeto (o null), no un array. Sin tipos generados de Supabase, el
  // cliente infiere "any[]" por defecto; se corrige con `.returns<T>()`.
  category: { name: string } | null;
  product_image: { url: string; position: number }[];
  product_size: {
    id: string;
    label: string;
    stock: number | null;
    available: boolean;
    position: number;
  }[];
};

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ProductosPage({
  searchParams,
}: PageProps<"/admin/productos">) {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <>
        <PageHeader title="Productos" />
        <BusinessRequired description="Necesitás configurar tu negocio antes de cargar productos." />
      </>
    );
  }

  const supabase = await createClient();
  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    params,
  ] = await Promise.all([
    supabase
      .from("product")
      .select(
        "id, name, slug, price, material, available, stock, category_id, category:category_id(name), product_image(url, position), product_size(id, label, stock, available, position)",
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .returns<ProductListRow[]>(),
    supabase
      .from("category")
      .select("id, name")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    searchParams,
  ]);

  if (productsError || categoriesError) {
    throw productsError ?? categoriesError;
  }

  const rows: ProductTableRow[] = products.map((product) => {
    const sizes = [...product.product_size]
      .sort((a, b) => a.position - b.position)
      .map(({ id, label, stock, available }) => ({ id, label, stock, available }));
    const stockSummary = summarizeStock({ stock: product.stock, sizes });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      material: product.material,
      available: product.available,
      categoryId: product.category_id,
      categoryName: product.category?.name ?? null,
      imageCount: product.product_image.length,
      coverUrl:
        [...product.product_image].sort((a, b) => a.position - b.position)[0]
          ?.url ?? null,
      stock: product.stock,
      sizes,
      stockSummary,
      stockState: stockSummary.state,
    };
  });

  const query = firstParam(params.q);
  const categoryParam = firstParam(params.categoria);
  const categoryId = categories.some((category) => category.id === categoryParam)
    ? categoryParam
    : ALL_CATEGORIES;
  const status = parseStatusFilter(firstParam(params.estado));

  return (
    <>
      <PageHeader
        title="Productos"
        description="Todo lo que ofrecés en la tienda. Los ocultos no se muestran a tus clientes."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/productos/importar">
                <FileSpreadsheet />
                Importar productos
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <PackagePlus />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      <ProductsTable
        // Remonta los filtros cuando se llega con otros parámetros (links
        // del dashboard o del sidebar); los cambios hechos acá solo
        // reescriben la URL y no disparan esta key.
        key={`${query}|${categoryId}|${status}`}
        products={rows}
        categories={categories}
        initialQuery={query}
        initialCategoryId={categoryId}
        initialStatus={status}
      />
    </>
  );
}
