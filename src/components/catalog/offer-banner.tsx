import Image from "next/image";
import Link from "next/link";
import type { FeaturedOffer } from "@/lib/offers/queries";
import { Button } from "@/components/catalog/ui/button";
import { OfferCountdown } from "./offer-clock";
import { PriceTag } from "./price-tag";

/**
 * Banner de la oferta destacada. Ocupa el lugar del banner promocional de
 * la Portada solo mientras la oferta está vigente.
 */
export function OfferBanner({
  offer,
  serverNow,
}: {
  offer: FeaturedOffer;
  serverNow: number;
}) {
  return (
    <section
      aria-labelledby="offer-heading"
      className={`grid items-center gap-8 overflow-hidden rounded-lg bg-cream ${
        offer.imageUrl ? "md:grid-cols-2" : ""
      }`}
    >
      {offer.imageUrl && (
        <div className="relative aspect-[4/5] bg-zinc-100 md:aspect-auto md:h-full md:min-h-[420px]">
          <Image
            src={offer.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div
        className={`space-y-5 px-6 py-10 ${offer.imageUrl ? "md:px-8" : "text-center"}`}
      >
        <p className="text-sm font-medium tracking-[0.15em] text-brand uppercase">
          Oferta por tiempo limitado
        </p>
        <h2 id="offer-heading" className="font-serif text-4xl text-zinc-800">
          {offer.productName}
        </h2>
        <PriceTag
          price={offer.price}
          compareAtPrice={offer.compareAtPrice}
          size="lg"
          className={offer.imageUrl ? "" : "justify-center"}
        />
        <div className={offer.imageUrl ? "" : "flex flex-col items-center"}>
          <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
            Termina en
          </p>
          <OfferCountdown endsAt={offer.endsAt} serverNow={serverNow} />
        </div>
        <Button asChild>
          <Link href={`/productos/${offer.productSlug}`}>Ver oferta</Link>
        </Button>
      </div>
    </section>
  );
}
