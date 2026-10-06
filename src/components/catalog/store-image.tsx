"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import {
  imageSrcKey,
  resolveImageStatus,
  type ImageLoadRecord,
} from "@/lib/images/load-status";
import { cn } from "@/lib/utils/cn";

export const IMAGE_ERROR_MESSAGE = "No se pudo cargar la imagen";

type StoreImageProps = ImageProps & {
  tone?: "dark" | "light";
  placement?: "center" | "corner";
  compact?: boolean;
};

export function StoreImage({
  alt,
  onLoad,
  onError,
  tone = "dark",
  placement = "center",
  compact = false,
  ...props
}: StoreImageProps) {
  const srcKey = imageSrcKey(props.src);
  const [record, setRecord] = useState<ImageLoadRecord | null>(null);
  const status = resolveImageStatus(record, srcKey);
  const light = tone === "light";

  return (
    <>
      {status === "loading" && (
        <span
          aria-hidden="true"
          data-image-status="loading"
          className={cn(
            "pointer-events-none absolute flex items-center justify-center",
            placement === "center" ? "inset-0" : "right-3 bottom-3",
          )}
        >
          <span
            className={cn(
              "block rounded-full border-2 motion-safe:animate-spin",
              compact ? "size-4" : "size-6",
              light ? "border-white/30 border-t-white" : "border-zinc-300 border-t-zinc-500",
            )}
          />
        </span>
      )}

      <Image
        {...props}
        alt={alt}
        className={cn(props.className, status === "error" && "invisible")}
        onLoad={(event) => {
          setRecord({ src: srcKey, status: "loaded" });
          onLoad?.(event);
        }}
        onError={(event) => {
          setRecord({ src: srcKey, status: "error" });
          onError?.(event);
        }}
      />

      {status === "error" && (
        <span
          data-image-status="error"
          title={compact ? IMAGE_ERROR_MESSAGE : undefined}
          className={cn(
            "pointer-events-none absolute flex items-center justify-center gap-1.5 text-center",
            placement === "corner"
              ? "right-3 bottom-3 rounded-sm px-2 py-1 text-xs"
              : "inset-0 flex-col px-2",
            placement === "corner" && (light ? "bg-black/50 text-white" : "bg-white/90 text-zinc-600"),
            placement === "center" && (light ? "text-white/75" : "bg-zinc-100 text-zinc-500"),
          )}
        >
          <ImageOff className={compact ? "size-4" : "size-6"} aria-hidden="true" />
          <span className={compact ? "sr-only" : "text-xs"}>{IMAGE_ERROR_MESSAGE}</span>
        </span>
      )}
    </>
  );
}
