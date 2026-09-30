import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/catalog/ui/button";
import { STORE_CONTAINER } from "./store-section";

export function HeroBanner({
  eyebrow,
  title,
  description,
  cta,
  imageUrl,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** null: sin destino válido, no se dibuja el botón. */
  cta: { label: string; href: string } | null;
  imageUrl: string | null;
}) {
  return (
    <section className="relative flex min-h-105 items-center overflow-hidden bg-brand sm:min-h-130 lg:min-h-150">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      <div
        aria-hidden="true"
        className={
          imageUrl
            ? "absolute inset-0 bg-linear-to-r from-black/65 via-black/30 to-transparent"
            : "absolute inset-0 bg-linear-to-br from-brand to-[#3f0e15]"
        }
      />
      <div className={`relative z-10 py-16 ${STORE_CONTAINER}`}>
        <div className="max-w-xl text-white">
          {eyebrow && (
            <p className="flex items-center gap-3 text-xs font-medium tracking-[0.25em] text-white/85 uppercase">
              {eyebrow}
              <span aria-hidden="true" className="h-px w-10 bg-white/70" />
            </p>
          )}
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-md text-base text-white/85 sm:text-lg">
              {description}
            </p>
          )}
          {cta && (
            <Button
              asChild
              className={`mt-8 px-10 ${
                imageUrl ? "" : "bg-white text-brand hover:bg-white/90"
              }`}
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
