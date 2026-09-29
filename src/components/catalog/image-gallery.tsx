import Image from "next/image";
import { SectionHeading } from "./section-heading";

/**
 * Galería de la portada. Composición tipo mosaico como en joyas.pdf: la
 * primera y cada quinta imagen ocupan dos filas en pantallas medianas.
 */
export function ImageGallery({
  title,
  subtitle,
  images,
}: {
  title: string;
  subtitle: string;
  images: { id: string; url: string; alt: string }[];
}) {
  return (
    <section aria-labelledby="gallery-heading" className="space-y-6">
      <SectionHeading
        id="gallery-heading"
        title={title || "Galería"}
        subtitle={subtitle || undefined}
      />
      <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4">
        {images.map((image, index) => (
          <li
            key={image.id}
            className={`relative overflow-hidden rounded-lg bg-zinc-100 ${
              index % 5 === 0 ? "row-span-2" : ""
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
