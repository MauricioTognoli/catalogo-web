"use client";

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import {
  DOUBLE_TAP_ZOOM,
  MAX_ZOOM,
  NO_ZOOM,
  ZOOM_STEP,
  clampIndex,
  clampOffset,
  distance,
  indexFromScroll,
  isZoomed,
  preferredScrollBehavior,
  withScale,
  type Point,
  type ZoomState,
} from "@/lib/gallery/gallery-math";
import type { PublicProductImage } from "@/lib/catalog/products";
import { cn } from "@/lib/utils/cn";
import { StoreImage } from "./store-image";

const TAP_MAX_MOVE = 10;
const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 300;

const CONTROL_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-white/10";

type Gesture =
  | { kind: "pinch"; distance: number; scale: number }
  | { kind: "pan"; start: Point; offset: Point };

type LightboxProps = {
  images: PublicProductImage[];
  productName: string;
  index: number;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({
  open,
  onOpenChange,
  onCloseAutoFocus,
  ...props
}: LightboxProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed inset-0 z-50 text-white outline-none"
        >
          <LightboxBody {...props} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LightboxBody({ images, productName, index, onIndexChange }: LightboxProps) {
  const count = images.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const tapStart = useRef<{ point: Point; time: number } | null>(null);
  const lastTap = useRef<{ point: Point; time: number } | null>(null);
  const lastPointerType = useRef<string>("mouse");
  const [mountIndex] = useState(index);
  const [zoom, setZoom] = useState<ZoomState>(NO_ZOOM);
  const zoomed = isZoomed(zoom);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = mountIndex * track.clientWidth;
    closeRef.current?.focus();
  }, [mountIndex]);

  function frame() {
    const track = trackRef.current;
    return { width: track?.clientWidth ?? 0, height: track?.clientHeight ?? 0 };
  }

  function goTo(target: number) {
    const next = clampIndex(target, count);
    const track = trackRef.current;
    if (!track || next === index) return;
    setZoom(NO_ZOOM);
    track.scrollTo({ left: next * track.clientWidth, behavior: preferredScrollBehavior() });
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const next = indexFromScroll(track.scrollLeft, track.clientWidth, count);
    if (next !== index) {
      setZoom(NO_ZOOM);
      onIndexChange(next);
    }
  }

  function zoomTo(scale: number) {
    setZoom((current) => withScale(current, scale, frame()));
  }

  function toggleZoom() {
    setZoom((current) =>
      isZoomed(current) ? NO_ZOOM : withScale(NO_ZOOM, DOUBLE_TAP_ZOOM, frame()),
    );
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(zoom.scale * ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomTo(zoom.scale / ZOOM_STEP);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  function startGesture(current: ZoomState) {
    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      gesture.current = {
        kind: "pinch",
        distance: Math.max(distance(points[0], points[1]), 1),
        scale: current.scale,
      };
    } else if (points.length === 1 && isZoomed(current)) {
      gesture.current = { kind: "pan", start: points[0], offset: current.offset };
    } else {
      gesture.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const point = { x: event.clientX, y: event.clientY };
    lastPointerType.current = event.pointerType;
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) tapStart.current = { point, time: event.timeStamp };
    if (pointers.current.size > 1 || zoomed) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    startGesture(zoom);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const current = gesture.current;
    const points = [...pointers.current.values()];

    if (current?.kind === "pinch" && points.length >= 2) {
      const scale = (current.scale * distance(points[0], points[1])) / current.distance;
      setZoom((previous) => withScale(previous, scale, frame()));
    } else if (current?.kind === "pan" && points.length === 1) {
      const [point] = points;
      setZoom((previous) => ({
        scale: previous.scale,
        offset: clampOffset(
          {
            x: current.offset.x + point.x - current.start.x,
            y: current.offset.y + point.y - current.start.y,
          },
          previous.scale,
          frame(),
        ),
      }));
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    const wasPinch = gesture.current?.kind === "pinch";
    pointers.current.delete(event.pointerId);

    if (
      event.type === "pointerup" &&
      event.pointerType !== "mouse" &&
      pointers.current.size === 0 &&
      !wasPinch
    ) {
      registerTap(point, event.timeStamp);
    }

    startGesture(zoom);
  }

  function handleDoubleClick() {
    if (lastPointerType.current === "mouse") toggleZoom();
  }

  function registerTap(point: Point, time: number) {
    const start = tapStart.current;
    tapStart.current = null;
    if (!start || time - start.time > TAP_MAX_MS || distance(start.point, point) > TAP_MAX_MOVE) {
      return;
    }

    const previous = lastTap.current;
    if (previous && time - previous.time < DOUBLE_TAP_MS && distance(previous.point, point) < 40) {
      lastTap.current = null;
      toggleZoom();
    } else {
      lastTap.current = { point, time };
    }
  }

  return (
    <div
      className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <DialogPrimitive.Title className="sr-only">Imágenes de {productName}</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        Deslizá o usá las flechas para cambiar de imagen. Pellizcá, tocá dos veces o usá los
        botones para acercar.
      </DialogPrimitive.Description>
      <p className="sr-only" aria-live="polite">
        Imagen {index + 1} de {count}
      </p>

      <div className="flex items-center gap-2 p-2 sm:p-4">
        {count > 1 && (
          <p aria-hidden="true" className="px-2 text-sm text-white/80 tabular-nums">
            {index + 1} / {count}
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomTo(zoom.scale / ZOOM_STEP)}
            aria-disabled={!zoomed}
            aria-label="Alejar"
            className={CONTROL_CLASS}
          >
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomTo(zoom.scale * ZOOM_STEP)}
            aria-disabled={zoom.scale >= MAX_ZOOM}
            aria-label="Acercar"
            className={CONTROL_CLASS}
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
          <DialogPrimitive.Close asChild>
            <button
              ref={closeRef}
              type="button"
              aria-label="Cerrar visor"
              className={cn(CONTROL_CLASS, "bg-white text-zinc-900 hover:bg-white/90")}
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </DialogPrimitive.Close>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className={cn(
            "flex h-full snap-x snap-mandatory overscroll-contain scrollbar-none [&::-webkit-scrollbar]:hidden",
            zoomed ? "overflow-hidden" : "overflow-x-auto",
          )}
        >
          {images.map((image, slideIndex) => {
            const active = slideIndex === index;
            return (
              <div
                key={image.id}
                aria-hidden={!active}
                className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
              >
                <div
                  onPointerDown={active ? handlePointerDown : undefined}
                  onPointerMove={active ? handlePointerMove : undefined}
                  onPointerUp={active ? handlePointerEnd : undefined}
                  onPointerCancel={active ? handlePointerEnd : undefined}
                  onDoubleClick={active ? handleDoubleClick : undefined}
                  className={cn(
                    "relative h-full w-full select-none",
                    active && zoomed
                      ? "cursor-grab touch-none active:cursor-grabbing"
                      : "cursor-zoom-in touch-pan-x touch-pan-y",
                  )}
                  style={
                    active && zoomed
                      ? {
                          transform: `translate3d(${zoom.offset.x}px, ${zoom.offset.y}px, 0) scale(${zoom.scale})`,
                        }
                      : undefined
                  }
                >
                  <StoreImage
                    src={image.url}
                    alt={`${productName} — imagen ${slideIndex + 1} de ${count}`}
                    fill
                    sizes="100vw"
                    tone="light"
                    draggable={false}
                    className="object-contain"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-disabled={index === 0}
              aria-label="Imagen anterior"
              className={cn(CONTROL_CLASS, "absolute top-1/2 left-2 -translate-y-1/2 sm:left-4")}
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-disabled={index === count - 1}
              aria-label="Imagen siguiente"
              className={cn(CONTROL_CLASS, "absolute top-1/2 right-2 -translate-y-1/2 sm:right-4")}
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
