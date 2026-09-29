import { formatPrice } from "@/lib/utils/formatPrice";
import { discountPercent } from "@/lib/offers/pricing";
import { cn } from "@/lib/utils/cn";

/** Precio vigente; con oferta, el precio normal tachado y el % de descuento. */
export function PriceTag({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const onSale = compareAtPrice !== null && compareAtPrice > price;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {onSale && <span className="sr-only">Precio de oferta:</span>}
      <span
        className={cn(
          "font-semibold text-brand",
          size === "lg" ? "text-xl" : "text-base",
        )}
      >
        {formatPrice(price)}
      </span>
      {onSale && (
        <>
          <span className="sr-only">, antes</span>
          <s className={cn("text-zinc-400", size === "lg" ? "text-base" : "text-sm")}>
            {formatPrice(compareAtPrice)}
          </s>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            -{discountPercent(compareAtPrice, price)}%
          </span>
        </>
      )}
    </p>
  );
}
