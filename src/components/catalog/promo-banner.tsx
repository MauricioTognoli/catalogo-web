import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/catalog/ui/button";

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
    <section
      aria-labelledby="promo-heading"
      className={`grid items-center gap-8 ${imageUrl ? "md:grid-cols-2" : ""}`}
    >
      {imageUrl && (
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div
        className={`space-y-4 ${imageUrl ? "md:px-8" : "rounded-lg bg-cream px-6 py-12 text-center"}`}
      >
        {eyebrow && (
          <p className="text-sm font-medium tracking-[0.15em] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        <h2 id="promo-heading" className="font-serif text-4xl text-zinc-800">
          {title}
        </h2>
        {description && <p className="text-zinc-600">{description}</p>}
        {cta && (
          <Button asChild className="mt-2">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
