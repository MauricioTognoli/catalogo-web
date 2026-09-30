import { ProductCard } from "./product-card";
import type { PublicProductCard } from "@/lib/catalog/products";

export function ProductGrid({
  products,
  layout = "grid",
}: {
  products: PublicProductCard[];
  layout?: "grid" | "carousel";
}) {
  if (layout === "carousel") {
    return (
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-auto"
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
