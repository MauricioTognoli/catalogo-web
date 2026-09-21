import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/formatPrice";
import { ImagePlaceholder } from "./image-placeholder";
import type { PublicProductCard } from "@/lib/catalog/products";

export function ProductCard({ product }: { product: PublicProductCard }) {
  return (
    <li>
      <Link
        href={`/productos/${product.slug}`}
        className="group block overflow-hidden rounded-lg border border-zinc-200 transition hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-600 dark:focus-visible:outline-zinc-100"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {product.mainImageUrl ? (
            <Image
              src={product.mainImageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholder label="Sin imagen" />
          )}
        </div>

        <div className="space-y-1 p-3">
          <p className="truncate font-medium">{product.name}</p>
          <p className="font-semibold">{formatPrice(product.price)}</p>
          {product.material && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {product.material}
            </p>
          )}
          {product.hasAvailableSizes && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Talles disponibles
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
