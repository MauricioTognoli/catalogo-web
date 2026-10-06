import Link from "next/link";
import { Button } from "@/components/catalog/ui/button";
import { StoreImage } from "./store-image";
import { StoreSection } from "./store-section";

export type CollectionBlockView = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  cta: { label: string; href: string } | null;
};

export function CollectionBlocks({ blocks }: { blocks: CollectionBlockView[] }) {
  if (blocks.length === 0) return null;

  return (
    <StoreSection aria-label="Colecciones">
      <div className="grid gap-12 md:grid-cols-2 md:gap-8">
        {blocks.map((block, index) => (
          <article key={index} className="relative sm:pb-12">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-zinc-100 sm:w-3/4">
              <StoreImage
                src={block.imageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 38vw, (min-width: 640px) 75vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative -mt-16 ml-auto flex w-[85%] flex-col items-center gap-3 bg-cream px-6 py-8 text-center shadow-sm sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-3/5 sm:py-10">
              {block.eyebrow && (
                <p className="text-xs font-medium tracking-[0.15em] text-brand uppercase">
                  {block.eyebrow}
                </p>
              )}
              <h2 className="font-serif text-2xl text-zinc-800 lg:text-3xl">
                {block.title}
              </h2>
              {block.cta && (
                <Button asChild size="sm" className="mt-2">
                  <Link href={block.cta.href}>{block.cta.label}</Link>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </StoreSection>
  );
}
