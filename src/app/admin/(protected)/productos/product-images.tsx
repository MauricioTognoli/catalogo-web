"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { reorderProductImages, uploadProductImage } from "@/actions/productImages";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteImageButton } from "./delete-image-button";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProductImage = {
  id: string;
  url: string;
  position: number;
};

type PendingFile = {
  key: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
};

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Formato no permitido.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Supera los ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const fileInputId = useId();

  // Copia local para poder reordenar de forma optimista. Se resincroniza
  // cuando el servidor manda una lista nueva (tras revalidar), usando el
  // patrón de React de ajustar estado durante el render en vez de un
  // efecto (evita el ciclo extra de render y el lint de setState-en-efecto).
  const [lastImages, setLastImages] = useState(images);
  const [orderedImages, setOrderedImages] = useState(images);
  if (images !== lastImages) {
    setLastImages(images);
    setOrderedImages(images);
  }

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  const isUploading = pendingFiles.some((item) => item.status === "uploading");

  function updatePending(key: string, patch: Partial<PendingFile>) {
    setPendingFiles((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
  }

  // Las fotos se suben apenas se eligen: no hace falta un segundo paso.
  // Se suben de a una para conservar el orden de selección.
  async function uploadFiles(files: File[]) {
    const batch: PendingFile[] = files.map((file) => {
      const error = validateFile(file);
      return {
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: error ? "error" : "uploading",
        error: error ?? undefined,
      };
    });
    setPendingFiles((prev) => [...prev, ...batch]);

    let uploaded = 0;
    for (const pending of batch) {
      if (pending.status === "error") continue;

      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("file", pending.file);

      const result = await uploadProductImage(formData);

      if (result.error) {
        updatePending(pending.key, { status: "error", error: result.error });
      } else {
        uploaded += 1;
        // Ya aparece en la grilla (el servidor revalidó la página).
        removePendingFile(pending.key);
      }
    }

    const failed = batch.length - uploaded;
    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Imagen subida" : `${uploaded} imágenes subidas`,
      );
    }
    if (failed > 0) {
      toast.error(
        failed === 1
          ? "Una imagen no se pudo subir"
          : `${failed} imágenes no se pudieron subir`,
      );
    }
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files && files.length > 0) void uploadFiles(Array.from(files));
    event.target.value = "";
  }

  function handleFileDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void uploadFiles(files);
  }

  async function persistOrder(newOrder: ProductImage[]) {
    setOrderedImages(newOrder);
    setIsReordering(true);

    const result = await reorderProductImages(
      productId,
      newOrder.map((image) => image.id),
    );

    if (result.error) {
      toast.error(result.error);
      setOrderedImages(images);
    }

    setIsReordering(false);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedImages.length) return;

    const next = [...orderedImages];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    void persistOrder(next);
  }

  function handleDrop(targetIndex: number) {
    const sourceIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const next = [...orderedImages];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistOrder(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imágenes</CardTitle>
        <CardDescription>
          La primera es la principal. Arrastralas o usá las flechas para
          cambiar el orden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {orderedImages.map((image, index) => (
            <li
              key={image.id}
              draggable={!isReordering}
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragEnd={() => {
                dragIndexRef.current = null;
              }}
              onDragOver={(event) => {
                // Solo reordenamiento interno; los archivos van a la zona de carga.
                if (dragIndexRef.current !== null) event.preventDefault();
              }}
              onDrop={() => handleDrop(index)}
              className="group overflow-hidden rounded-lg border bg-card"
            >
              <div className="relative aspect-square cursor-grab bg-muted active:cursor-grabbing">
                <Image
                  src={image.url}
                  alt={
                    index === 0
                      ? "Imagen principal del producto"
                      : `Imagen ${index + 1} del producto`
                  }
                  fill
                  sizes="(min-width: 1024px) 200px, 50vw"
                  className="object-cover"
                />
                {index === 0 && (
                  <Badge className="absolute top-2 left-2">Principal</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0 || isReordering}
                    aria-label="Mover antes"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === orderedImages.length - 1 || isReordering}
                    aria-label="Mover después"
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <DeleteImageButton productId={productId} imageId={image.id} />
              </div>
            </li>
          ))}

          {pendingFiles.map((pending) => (
            <li
              key={pending.key}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <div className="relative aspect-square bg-muted">
                {/* Preview local antes de subir: blob URL, no un recurso
                    remoto, por eso <img> en vez de next/image acá. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pending.previewUrl}
                  alt={`Vista previa de ${pending.file.name}`}
                  className={cn(
                    "h-full w-full object-cover",
                    pending.status === "uploading" && "opacity-50",
                  )}
                />
                {pending.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin" aria-label="Subiendo" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1 pl-2">
                <p
                  role={pending.status === "error" ? "alert" : undefined}
                  className={cn(
                    "truncate text-xs",
                    pending.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                  title={pending.error ?? pending.file.name}
                >
                  {pending.status === "error" ? pending.error : "Subiendo..."}
                </p>
                {pending.status === "error" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => removePendingFile(pending.key)}
                    aria-label={`Descartar ${pending.file.name}`}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </li>
          ))}

          <li className={cn(orderedImages.length + pendingFiles.length === 0 && "col-span-full")}>
            <label
              htmlFor={fileInputId}
              onDragOver={(event) => {
                if (dragIndexRef.current !== null) return;
                event.preventDefault();
                setIsDraggingFiles(true);
              }}
              onDragLeave={() => setIsDraggingFiles(false)}
              onDrop={handleFileDrop}
              className={cn(
                "flex h-full min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors hover:bg-accent/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                isDraggingFiles && "border-primary bg-accent",
              )}
            >
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">
                {isUploading ? "Subiendo..." : "Agregar imágenes"}
              </span>
              <span
                id={`${fileInputId}-hint`}
                className="text-xs text-muted-foreground"
              >
                JPG, PNG o WEBP · hasta {MAX_FILE_SIZE_MB} MB
              </span>
              <input
                id={fileInputId}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                aria-describedby={`${fileInputId}-hint`}
                className="sr-only"
              />
            </label>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
