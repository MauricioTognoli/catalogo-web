import { ProductCard, type CardImagePriority } from "./product-card";
import type { PublicProductCard } from "@/lib/catalog/products";

const CAROUSEL_IMAGE_SIZES =
  "(min-width: 1152px) 262px, (min-width: 768px) 25vw, (min-width: 640px) 42vw, 70vw";

function imagePriority(index: number, priorityCount: number): CardImagePriority {
  if (index >= priorityCount) return "auto";
  return index < 2 ? "high" : "eager";
}

export function ProductGrid({
  products,
  layout = "grid",
  priorityCount = 0,
}: {
  products: PublicProductCard[];
  layout?: "grid" | "carousel";
  priorityCount?: number;
}) {
  if (layout === "carousel") {
    return (
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            imageSizes={CAROUSEL_IMAGE_SIZES}
            imagePriority={imagePriority(index, priorityCount)}
            className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-auto"
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          imagePriority={imagePriority(index, priorityCount)}
        />
      ))}
    </ul>
  );
}
