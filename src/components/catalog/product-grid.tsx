import { ProductCard } from "./product-card";
import type { PublicProductCard } from "@/lib/catalog/products";

export function ProductGrid({ products }: { products: PublicProductCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
