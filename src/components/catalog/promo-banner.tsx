import Link from "next/link";
import { Button } from "@/components/catalog/ui/button";
import { StoreImage } from "./store-image";
import { StoreSection } from "./store-section";

/** Banner promocional principal ("Must Have" en joyas.pdf). */
export function PromoBanner({
  imageUrl,
  eyebrow,
  title,
  description,
  cta,
}: {
  imageUrl: string | null;
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string } | null;
}) {
  return (
    <StoreSection aria-labelledby="promo-heading">
      <div
        className={`grid items-center gap-10 ${
          imageUrl ? "md:grid-cols-2 md:gap-16" : ""
        }`}
      >
        {imageUrl && (
          <div className="relative aspect-4/5 overflow-hidden bg-zinc-100">
            <StoreImage
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-6 pt-20 pb-6 text-white"
            >
              <p className="font-serif text-2xl">{title}</p>
              {eyebrow && (
                <p className="mt-1 text-xs tracking-[0.15em] text-white/80 uppercase">
                  {eyebrow}
                </p>
              )}
            </div>
          </div>
        )}
        <div
          className={
            imageUrl
              ? "space-y-5"
              : "space-y-5 bg-cream px-6 py-14 text-center"
          }
        >
          {eyebrow && (
            <p className="text-xs font-medium tracking-[0.2em] text-brand uppercase">
              {eyebrow}
            </p>
          )}
          <h2
            id="promo-heading"
            className="font-serif text-4xl leading-tight text-zinc-800 md:text-5xl"
          >
            {title}
          </h2>
          {description && <p className="max-w-md text-zinc-600">{description}</p>}
          {cta && (
            <Button asChild className="mt-2 px-10">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </StoreSection>
  );
}
