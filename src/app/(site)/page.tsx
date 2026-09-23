import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { getPublicProducts } from "@/lib/catalog/products";
import { ProductGrid } from "@/components/catalog/product-grid";
import { HeroBanner } from "@/components/catalog/hero-banner";
import { CategoryTabs } from "@/components/catalog/category-tabs";

const NEW_ARRIVALS_LIMIT = 8;
const TOP_PRODUCTS_PER_CATEGORY = 8;

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

  // Un fetch por categoría (mismo getPublicProducts que ya usa la página
  // de categoría): PublicProductCard no trae category_id, así que no se
  // puede derivar esto filtrando la lista general en el cliente.
  const categoryGroups = await Promise.all(
    categories.map(async (category) => ({
      category,
      products: (await getPublicProducts(business.id, category.id)).slice(
        0,
        TOP_PRODUCTS_PER_CATEGORY,
      ),
    })),
  );

  const newArrivals = products.slice(0, NEW_ARRIVALS_LIMIT);

  return (
    <div className="space-y-16">
      <HeroBanner
        businessName={business.name}
        imageUrl={products[0]?.mainImageUrl ?? null}
      />

      {categoryGroups.some((group) => group.products.length > 0) && (
        <section aria-labelledby="top-product-heading" className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Seleccionados para vos
            </p>
            <h2
              id="top-product-heading"
              className="mt-2 font-serif text-3xl text-zinc-900"
            >
              Top Product
            </h2>
          </div>
          <CategoryTabs groups={categoryGroups} />
        </section>
      )}

      <section id="productos" aria-labelledby="new-arrivals-heading" className="space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Recién llegados
          </p>
          <h2
            id="new-arrivals-heading"
            className="mt-2 font-serif text-3xl text-zinc-900"
          >
            New Arrivals
          </h2>
        </div>

        {newArrivals.length === 0 ? (
          <p className="text-center text-zinc-600">
            Todavía no hay productos disponibles.
          </p>
        ) : (
          <ProductGrid products={newArrivals} />
        )}
      </section>
    </div>
  );
}
