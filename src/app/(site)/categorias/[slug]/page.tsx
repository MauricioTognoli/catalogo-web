import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategory } from "@/lib/catalog/categories";
import { getPublicProducts } from "@/lib/catalog/products";
import { ProductGrid } from "@/components/catalog/product-grid";

type CategoriaPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness();
  if (!business) return {};

  const category = await getPublicCategory(business.id, slug);
  if (!category) return {};

  return {
    title: `${category.name} | ${business.name}`,
    description: `Productos de ${category.name} en ${business.name}.`,
  };
}

export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const { slug } = await params;
  const business = await getPublicBusiness();

  if (!business) {
    notFound();
  }

  // Resuelve por business_id + slug, nunca por nombre, y valida que la
  // categoría pertenece al negocio actual (no solo que el slug exista).
  const category = await getPublicCategory(business.id, slug);

  if (!category) {
    notFound();
  }

  const products = await getPublicProducts(business.id, category.id);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-zinc-900">{category.name}</h1>

      {products.length === 0 ? (
        <p className="text-zinc-600">
          Todavía no hay productos disponibles en esta categoría.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
