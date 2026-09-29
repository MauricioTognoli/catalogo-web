import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/catalog/ui/button";

export type CollectionBlockView = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  cta: { label: string; href: string } | null;
};

/** Dos bloques de colección: imagen + panel crema (como en joyas.pdf). */
export function CollectionBlocks({ blocks }: { blocks: CollectionBlockView[] }) {
  if (blocks.length === 0) return null;

  return (
    <section aria-label="Colecciones" className="grid gap-6 md:grid-cols-2">
      {blocks.map((block, index) => (
        <article
          key={index}
          className="grid grid-cols-2 overflow-hidden rounded-lg bg-cream"
        >
          <div className="relative min-h-56 bg-zinc-100">
            <Image
              src={block.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            {block.eyebrow && (
              <p className="text-xs font-medium tracking-[0.15em] text-brand uppercase">
                {block.eyebrow}
              </p>
            )}
            <h3 className="font-serif text-2xl text-zinc-800">{block.title}</h3>
            {block.cta && (
              <Button asChild size="sm" className="mt-1">
                <Link href={block.cta.href}>{block.cta.label}</Link>
              </Button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
