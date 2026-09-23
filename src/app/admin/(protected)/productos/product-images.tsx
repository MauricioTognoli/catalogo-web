"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { reorderProductImages, uploadProductImage } from "@/actions/productImages";
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
  status: "pending" | "uploading" | "error" | "done";
  error?: string;
};

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
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const next: PendingFile[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));

    setPendingFiles((prev) => [...prev, ...next]);
    event.target.value = "";
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.key !== key);
    });
  }

  async function handleUploadAll() {
    setIsUploading(true);

    for (const pending of pendingFiles) {
      if (pending.status === "done") continue;

      if (!ACCEPTED_MIME_TYPES.includes(pending.file.type)) {
        setPendingFiles((prev) =>
          prev.map((item) =>
            item.key === pending.key
              ? { ...item, status: "error", error: "Formato no permitido." }
              : item,
          ),
        );
        continue;
      }

      if (pending.file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setPendingFiles((prev) =>
          prev.map((item) =>
            item.key === pending.key
              ? {
                  ...item,
                  status: "error",
                  error: `Supera el máximo de ${MAX_FILE_SIZE_MB} MB.`,
                }
              : item,
          ),
        );
        continue;
      }

      setPendingFiles((prev) =>
        prev.map((item) =>
          item.key === pending.key ? { ...item, status: "uploading" } : item,
        ),
      );

      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("file", pending.file);

      const result = await uploadProductImage(formData);

      setPendingFiles((prev) =>
        prev.map((item) =>
          item.key === pending.key
            ? result.error
              ? { ...item, status: "error", error: result.error }
              : { ...item, status: "done" }
            : item,
        ),
      );
    }

    setIsUploading(false);
  }

  function clearDoneFiles() {
    setPendingFiles((prev) => {
      const remaining = prev.filter((item) => item.status !== "done");
      prev
        .filter((item) => item.status === "done")
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return remaining;
    });
  }

  async function persistOrder(newOrder: ProductImage[]) {
    setOrderedImages(newOrder);
    setIsReordering(true);
    setReorderError(null);

    const result = await reorderProductImages(
      productId,
      newOrder.map((image) => image.id),
    );

    if (result.error) {
      setReorderError(result.error);
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

  const hasPendingFiles = pendingFiles.length > 0;
  const doneCount = pendingFiles.filter((item) => item.status === "done").length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Imágenes</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          La primera imagen es la principal del producto.
        </p>
      </div>

      <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <label htmlFor={fileInputId} className="block text-sm font-medium">
          Agregar imágenes
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          aria-describedby={`${fileInputId}-hint`}
          className="mt-1 block w-full text-sm"
        />
        <p id={`${fileInputId}-hint`} className="mt-1 text-xs text-zinc-500">
          JPG, PNG o WEBP. Máximo {MAX_FILE_SIZE_MB} MB por archivo.
        </p>

        {hasPendingFiles && (
          <ul className="mt-4 flex flex-wrap gap-3">
            {pendingFiles.map((pending) => (
              <li
                key={pending.key}
                className="flex w-28 flex-col items-center gap-1 text-center"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                  {/* Preview local antes de subir: blob URL, no un recurso
                      remoto, por eso <img> en vez de next/image acá. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pending.previewUrl}
                    alt={`Vista previa de ${pending.file.name}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="w-full truncate text-xs" title={pending.file.name}>
                  {pending.file.name}
                </p>
                {pending.status === "uploading" && (
                  <p className="text-xs text-zinc-500">Subiendo...</p>
                )}
                {pending.status === "error" && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {pending.error}
                  </p>
                )}
                {pending.status === "done" && (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Subida ✓
                  </p>
                )}
                {pending.status !== "uploading" && pending.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => removePendingFile(pending.key)}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasPendingFiles && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleUploadAll}
              disabled={isUploading}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isUploading
                ? "Subiendo..."
                : `Subir ${pendingFiles.length} imagen${pendingFiles.length === 1 ? "" : "es"}`}
            </button>
            {doneCount > 0 && !isUploading && (
              <button
                type="button"
                onClick={clearDoneFiles}
                className="text-sm text-zinc-500 hover:underline"
              >
                Limpiar subidas
              </button>
            )}
          </div>
        )}
      </div>

      {reorderError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {reorderError}
        </p>
      )}

      {orderedImages.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Todavía no hay imágenes para este producto.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {orderedImages.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="flex w-32 flex-col items-center gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src={image.url}
                  alt={
                    index === 0
                      ? "Imagen principal del producto"
                      : `Imagen ${index + 1} del producto`
                  }
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              {index === 0 && (
                <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                  Principal
                </span>
              )}

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0 || isReordering}
                  aria-label="Mover imagen hacia arriba en el orden"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === orderedImages.length - 1 || isReordering}
                  aria-label="Mover imagen hacia abajo en el orden"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  ↓
                </button>
              </div>

              <DeleteImageButton productId={productId} imageId={image.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
