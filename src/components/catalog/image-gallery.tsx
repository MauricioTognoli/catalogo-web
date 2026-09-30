import Image from "next/image";
import { SectionHeading } from "./section-heading";
import { StoreSection } from "./store-section";

const MOSAIC_TILES = [
  "col-span-2 row-span-2 md:col-span-1",
  "md:col-span-2",
  "md:row-span-2",
  "",
  "",
];

/**
 * Galería de la portada. Mosaico como en joyas.pdf: en pantallas medianas
 * cada grupo de cinco imágenes arma una columna alta a cada lado y, en el
 * centro, una imagen ancha sobre dos chicas.
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
    <StoreSection aria-labelledby="gallery-heading">
      <SectionHeading
        id="gallery-heading"
        title={title || "Galería"}
        subtitle={subtitle || undefined}
        className="mb-8"
      />
      <ul className="grid grid-flow-dense auto-rows-37.5 grid-cols-2 gap-3 sm:auto-rows-50 md:grid-cols-4 md:auto-rows-55">
        {images.map((image, index) => (
          <li
            key={image.id}
            className={`relative overflow-hidden bg-zinc-100 ${
              MOSAIC_TILES[index % MOSAIC_TILES.length]
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-500 hover:scale-105"
            />
          </li>
        ))}
      </ul>
    </StoreSection>
  );
}
