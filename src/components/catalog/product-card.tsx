import Link from "next/link";
import Image from "next/image";
import { ImagePlaceholder } from "./image-placeholder";
import { PriceTag } from "./price-tag";
import type { PublicProductCard } from "@/lib/catalog/products";
import { cn } from "@/lib/utils/cn";

const FOCUS_CLASS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function StockBadge({ product }: { product: PublicProductCard }) {
  if (!product.inStock) {
    return (
      <span className="absolute top-3 right-3 rounded-sm bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700">
        Sin stock
      </span>
    );
  }
  if (product.compareAtPrice !== null) {
    return (
      <span className="absolute top-3 right-3 rounded-sm bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground">
        Oferta
      </span>
    );
  }
  return null;
}

function ProductImage({ product }: { product: PublicProductCard }) {
  return product.mainImageUrl ? (
    <Image
      src={product.mainImageUrl}
      alt={product.name}
      fill
      sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
      className="object-cover transition duration-300 group-hover:scale-105"
    />
  ) : (
    <ImagePlaceholder label="Sin imagen" />
  );
}

export function ProductCard({
  product,
  variant = "card",
  className,
}: {
  product: PublicProductCard;
  variant?: "card" | "minimal";
  className?: string;
}) {
  if (variant === "minimal") {
    return (
      <li className={className}>
        <Link
          href={`/productos/${product.slug}`}
          className={cn("group block text-center", FOCUS_CLASS)}
        >
          <div className="relative aspect-square w-full overflow-hidden bg-white">
            <ProductImage product={product} />
            <StockBadge product={product} />
          </div>
          <p className="mt-4 truncate font-serif text-lg text-zinc-900">
            {product.name}
          </p>
          <PriceTag
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            className="mt-1 justify-center"
          />
          <span className="mt-2 inline-block text-xs tracking-wide text-zinc-500 uppercase underline-offset-4 group-hover:text-brand group-hover:underline">
            Ver producto
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className={className}>
      <Link
        href={`/productos/${product.slug}`}
        className={cn(
          "group flex h-full flex-col border border-zinc-200 bg-white transition hover:border-brand hover:shadow-md",
          FOCUS_CLASS,
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          <ProductImage product={product} />
          <StockBadge product={product} />
        </div>

        <div className="flex-1 space-y-1 border-t border-zinc-100 p-4">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          <p className="truncate text-sm text-zinc-800">{product.name}</p>
          {product.material && (
            <p className="text-xs text-zinc-500">{product.material}</p>
          )}
          {product.inStock && product.hasAvailableSizes && (
            <p className="text-xs text-zinc-500">Talles disponibles</p>
          )}
        </div>
      </Link>
    </li>
  );
}
