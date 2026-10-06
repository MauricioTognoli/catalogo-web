"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImagePlaceholder } from "./image-placeholder";
import { ImageLightbox } from "./image-lightbox";
import {
  clampIndex,
  indexFromScroll,
  preferredScrollBehavior,
} from "@/lib/gallery/gallery-math";
import type { PublicProductImage } from "@/lib/catalog/products";
import { cn } from "@/lib/utils/cn";

const ARROW_CLASS =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md transition hover:bg-white hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-white/90 aria-disabled:hover:text-zinc-800 md:flex";

export function ProductGallery({
  images,
  productName,
}: {
  images: PublicProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        <ImagePlaceholder label="Sin imágenes" />
      </div>
    );
  }

  function scrollToIndex(index: number, behavior: ScrollBehavior) {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior });
  }

  function goTo(index: number) {
    const next = clampIndex(index, count);
    setActiveIndex(next);
    scrollToIndex(next, preferredScrollBehavior());
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const next = indexFromScroll(track.scrollLeft, track.clientWidth, count);
    if (next !== activeIndex) setActiveIndex(next);
  }

  function handleViewerIndex(index: number) {
    setActiveIndex(index);
    scrollToIndex(index, "instant");
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    trackRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [activeIndex]?.focus({ preventScroll: true });
  }

  function openViewer(index: number) {
    setActiveIndex(index);
    setViewerOpen(true);
  }

  return (
    <div className="min-w-0 space-y-3">
      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label={`Imágenes de ${productName}`}
        className="relative"
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-zinc-200 bg-zinc-100 scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              role={count > 1 ? "group" : undefined}
              aria-roledescription={count > 1 ? "imagen" : undefined}
              aria-label={count > 1 ? `${index + 1} de ${count}` : undefined}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              <button
                type="button"
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => openViewer(index)}
                aria-label={
                  count > 1
                    ? `Ampliar imagen ${index + 1} de ${count}`
                    : `Ampliar imagen de ${productName}`
                }
                className="relative block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <Image
                  src={image.url}
                  alt={`${productName} — imagen ${index + 1} de ${count}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                  draggable={false}
                  className="object-cover"
                />
              </button>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-disabled={activeIndex === 0}
              aria-label="Imagen anterior"
              className={cn(ARROW_CLASS, "left-3")}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-disabled={activeIndex === count - 1}
              aria-label="Imagen siguiente"
              className={cn(ARROW_CLASS, "right-3")}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <p
              aria-hidden="true"
              className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums"
            >
              {activeIndex + 1} / {count}
            </p>
            <p className="sr-only" aria-live="polite">
              Imagen {activeIndex + 1} de {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          role="group"
          aria-label="Miniaturas del producto"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`Ver imagen ${index + 1} de ${count}`}
              onClick={() => goTo(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                index === activeIndex ? "border-brand" : "border-transparent",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        productName={productName}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        index={activeIndex}
        onIndexChange={handleViewerIndex}
        onCloseAutoFocus={restoreFocus}
      />
    </div>
  );
}
