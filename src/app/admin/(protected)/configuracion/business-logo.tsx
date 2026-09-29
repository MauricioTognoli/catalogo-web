"use client";

import Image from "next/image";
import { useId, useState, useTransition, type ChangeEvent } from "react";
import { ImageUp, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { uploadBusinessLogo } from "@/actions/business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteLogoButton } from "./delete-logo-button";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function BusinessLogo({ logoUrl }: { logoUrl: string | null }) {
  const fileInputId = useId();
  const [pending, startTransition] = useTransition();
  // Preview local mientras sube; al revalidar llega el logo real.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error("Formato no permitido. Usá JPG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar los ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadBusinessLogo({ error: null }, formData);

      URL.revokeObjectURL(localUrl);
      setPreviewUrl(null);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Logo actualizado");
      }
    });
  }

  const shownUrl = previewUrl ?? logoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>
          Se usa en la tienda y en este panel. Ideal: cuadrado, fondo liso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {shownUrl ? (
            previewUrl ? (
              // Blob URL local: next/image no aplica acá.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Vista previa del logo"
                className="h-full w-full object-cover opacity-60"
              />
            ) : (
              <Image
                src={shownUrl}
                alt="Logo actual del negocio"
                fill
                sizes="96px"
                className="object-cover"
              />
            )
          ) : (
            <Store className="size-8 text-muted-foreground" aria-label="Sin logo" />
          )}
          {pending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" aria-label="Subiendo" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" disabled={pending}>
              <label htmlFor={fileInputId} className="cursor-pointer">
                <ImageUp />
                {logoUrl ? "Reemplazar" : "Subir logo"}
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  disabled={pending}
                  aria-describedby={`${fileInputId}-hint`}
                  className="sr-only"
                />
              </label>
            </Button>
            {logoUrl && !pending && <DeleteLogoButton />}
          </div>
          <p id={`${fileInputId}-hint`} className="text-xs text-muted-foreground">
            JPG, PNG o WEBP. Máximo {MAX_FILE_SIZE_MB} MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
