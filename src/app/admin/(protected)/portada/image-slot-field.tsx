"use client";

import Image from "next/image";
import { useId, useState, useTransition, type ChangeEvent } from "react";
import { ImagePlus, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeStorefrontImage, uploadStorefrontImage } from "@/actions/storefront";
import type { ImageSlot } from "@/lib/storefront/config";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export const MAX_FILE_SIZE_MB = 5;
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Validación del lado del cliente (el servidor vuelve a validar). */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Formato no permitido. Usá JPG, PNG o WEBP.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `La imagen no puede superar los ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

/**
 * Imagen de un lugar de la portada (hero, colección, promoción). Se sube
 * al elegirla y queda en el borrador; quitarla pide confirmación.
 */
export function ImageSlotField({
  slot,
  imageUrl,
  label,
  hint,
  aspectClassName = "aspect-[16/9]",
}: {
  slot: Exclude<ImageSlot, "gallery">;
  imageUrl: string | null;
  label: string;
  hint: string;
  aspectClassName?: string;
}) {
  const inputId = useId();
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", file);
      const result = await uploadStorefrontImage(formData);

      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);

      if (result.error) toast.error(result.error);
      else toast.success(imageUrl ? "Imagen reemplazada" : "Imagen agregada");
    });
  }

  const shownUrl = previewUrl ?? imageUrl;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium" id={`${inputId}-label`}>
        {label}
      </span>
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border bg-muted",
          aspectClassName,
        )}
      >
        {shownUrl ? (
          previewUrl ? (
            // Blob URL local mientras sube: next/image no aplica.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover opacity-60" />
          ) : (
            <Image src={shownUrl} alt="" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" aria-label="Subiendo imagen" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={pending}>
          <label htmlFor={inputId} className="cursor-pointer">
            <ImageUp />
            {imageUrl ? "Reemplazar" : "Subir imagen"}
            <input
              id={inputId}
              type="file"
              accept={ACCEPTED_MIME_TYPES.join(",")}
              onChange={handleFileSelect}
              disabled={pending}
              aria-labelledby={`${inputId}-label`}
              aria-describedby={`${inputId}-hint`}
              className="sr-only"
            />
          </label>
        </Button>
        {imageUrl && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Quitar
          </Button>
        )}
      </div>
      <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
        {hint} JPG, PNG o WEBP, hasta {MAX_FILE_SIZE_MB} MB.
      </p>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Quitar la imagen?"
        description="Se quita del borrador. La tienda la sigue mostrando hasta que publiques."
        confirmLabel="Quitar"
        action={removeStorefrontImage}
        fields={{ slot }}
        successMessage="Imagen quitada del borrador"
      />
    </div>
  );
}
