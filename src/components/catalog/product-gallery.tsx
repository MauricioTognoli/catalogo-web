"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlaceholder } from "./image-placeholder";
import type { PublicProductImage } from "@/lib/catalog/products";

export function ProductGallery({
  images,
  productName,
}: {
  images: PublicProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <ImagePlaceholder label="Sin imágenes" />
      </div>
    );
  }

  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <Image
          src={activeImage.url}
          alt={`${productName} — imagen ${activeIndex + 1} de ${images.length}`}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Miniaturas del producto"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-pressed={index === activeIndex}
              aria-label={`Ver imagen ${index + 1} de ${images.length}`}
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 overflow-hidden rounded border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
                index === activeIndex
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-transparent"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
