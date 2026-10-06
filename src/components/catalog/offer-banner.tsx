import Link from "next/link";
import type { FeaturedOffer } from "@/lib/offers/queries";
import { Button } from "@/components/catalog/ui/button";
import { StoreImage } from "./store-image";
import { OfferCountdown } from "./offer-clock";
import { PriceTag } from "./price-tag";
import { StoreSection } from "./store-section";

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
    <StoreSection aria-labelledby="offer-heading">
      <div
        className={`grid items-center gap-10 ${
          offer.imageUrl ? "md:grid-cols-2 md:gap-16" : ""
        }`}
      >
        {offer.imageUrl && (
          <div className="relative aspect-4/5 overflow-hidden bg-zinc-100">
            <StoreImage
              src={offer.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div
          className={
            offer.imageUrl
              ? "space-y-5"
              : "flex flex-col items-center space-y-5 bg-cream px-6 py-14 text-center"
          }
        >
          <p className="text-xs font-medium tracking-[0.2em] text-brand uppercase">
            Oferta por tiempo limitado
          </p>
          <h2
            id="offer-heading"
            className="font-serif text-4xl leading-tight text-zinc-800 md:text-5xl"
          >
            {offer.productName}
          </h2>
          <PriceTag
            price={offer.price}
            compareAtPrice={offer.compareAtPrice}
            size="lg"
            className={offer.imageUrl ? "" : "justify-center"}
          />
          <div>
            <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
              Termina en
            </p>
            <OfferCountdown endsAt={offer.endsAt} serverNow={serverNow} />
          </div>
          <Button asChild className="px-10">
            <Link href={`/productos/${offer.productSlug}`}>Ver oferta</Link>
          </Button>
        </div>
      </div>
    </StoreSection>
  );
}
