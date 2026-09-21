import Link from "next/link";
import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { getPublicProducts } from "@/lib/catalog/products";
import { ProductGrid } from "@/components/catalog/product-grid";

export async function generateMetadata(): Promise<Metadata> {
  const business = await getPublicBusiness();

  if (!business) {
    return {};
  }

  return {
    title: business.name,
    description: `Catálogo de ${business.name}. Mirá nuestros productos disponibles.`,
  };
}

export default async function HomePage() {
  const business = await getPublicBusiness();

  // El layout ya llama notFound() si no hay negocio; esto es solo una
  // guarda de tipos para que TypeScript angoste `business` acá abajo.
  if (!business) {
    return null;
  }

  const [categories, products] = await Promise.all([
    getPublicCategories(business.id),
    getPublicProducts(business.id),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">{business.name}</h1>

      {categories.length > 0 && (
        <section aria-labelledby="categorias-heading" className="space-y-3">
          <h2 id="categorias-heading" className="text-lg font-semibold">
            Categorías
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categorias/${category.slug}`}
                  className="inline-block rounded-full border border-zinc-300 px-4 py-1.5 text-sm hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="productos-heading" className="space-y-4">
        <h2 id="productos-heading" className="text-lg font-semibold">
          Productos
        </h2>

        {products.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Todavía no hay productos disponibles.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </div>
  );
}
