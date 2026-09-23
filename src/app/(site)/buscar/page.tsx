import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { searchPublicProducts } from "@/lib/catalog/products";
import { ProductGrid } from "@/components/catalog/product-grid";

type BuscarPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({
  searchParams,
}: BuscarPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Resultados para "${q}"` : "Buscar" };
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const business = await getPublicBusiness();

  if (!business) {
    notFound();
  }

  const products = query
    ? await searchPublicProducts(business.id, query)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-zinc-900">
        {query ? `Resultados para "${query}"` : "Buscar productos"}
      </h1>

      {query === "" ? (
        <p className="text-zinc-600">
          Escribí algo en el buscador para empezar.
        </p>
      ) : products.length === 0 ? (
        <p className="text-zinc-600">
          No encontramos productos que coincidan con &quot;{query}&quot;.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
