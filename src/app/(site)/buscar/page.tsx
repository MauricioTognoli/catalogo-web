import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { searchPublicProducts } from "@/lib/catalog/products";
import { ProductGrid } from "@/components/catalog/product-grid";
import { OfferRefresher } from "@/components/catalog/offer-refresher";

type BuscarPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({
  searchParams,
}: BuscarPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Resultados para "${q}"` : "Buscar",
    // Resultados de búsqueda: contenido duplicado/infinito, no se indexa.
    robots: { index: false, follow: true },
  };
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
    <div className="mx-auto w-full max-w-6xl px-4 space-y-6 py-10">
      <h1 className="font-serif text-3xl text-zinc-900">
        {query ? `Resultados para "${query}"` : "Buscar productos"}
      </h1>

      {query === "" ? (
        <p className="text-zinc-600">
          Escribí algo en el buscador para empezar.
        </p>
      ) : products.length === 0 ? (
        <div className="space-y-3">
          <p className="text-zinc-600">
            No encontramos productos que coincidan con &quot;{query}&quot;.
          </p>
          <Link
            href="/#productos"
            className="inline-block text-sm font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Ver todos los productos
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={products} />
          <OfferRefresher endsAt={products.map((product) => product.offerEndsAt)} />
        </>
      )}
    </div>
  );
}
