"use client";

import Image from "next/image";
import { useState, useTransition, type FormEvent } from "react";
import { ImagePlus, Images, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeStorefrontImage, uploadStorefrontImage } from "@/actions/storefront";
import { LIMITS, galleryHiddenReason } from "@/lib/storefront/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_MB, validateImageFile } from "./image-slot-field";
import { ReorderButtons, moveItem } from "./reorder-buttons";
import { SectionCard } from "./section-card";
import { isDirty, useSaveSection } from "./use-save-section";

export type GalleryImageView = { id: string; url: string; alt: string };

type Row = { id: string; alt: string };

function AddImageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Elegí una imagen.");
      return;
    }
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    formData.append("slot", "gallery");

    startTransition(async () => {
      const result = await uploadStorefrontImage(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Imagen agregada a la galería");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Agregar imagen a la galería</DialogTitle>
            <DialogDescription>
              Se agrega al final. Después podés cambiar el orden.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="gallery-file">Imagen</Label>
            <Input
              id="gallery-file"
              name="file"
              type="file"
              required
              accept={ACCEPTED_MIME_TYPES.join(",")}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG o WEBP, hasta {MAX_FILE_SIZE_MB} MB.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gallery-alt">Texto alternativo</Label>
            <Input
              id="gallery-alt"
              name="alt"
              required
              maxLength={LIMITS.alt}
              placeholder="Ej: Mano con anillos de plata y turquesa"
              aria-describedby="gallery-alt-hint"
            />
            <p id="gallery-alt-hint" className="text-xs text-muted-foreground">
              Describe la foto para quienes usan lectores de pantalla y para
              buscadores.
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? "Subiendo..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GalleryEditor({
  title,
  subtitle,
  images,
}: {
  title: string;
  subtitle: string;
  images: GalleryImageView[];
}) {
  const savedRows: Row[] = images.map(({ id, alt }) => ({ id, alt }));
  const [texts, setTexts] = useState({ title, subtitle });
  const [rows, setRows] = useState(savedRows);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const { save, pending } = useSaveSection();

  // Subir o quitar imágenes se guarda al instante y llega por props. Se
  // incorpora sin perder el orden ni los alt que se estén editando:
  // quedan las filas existentes y se suman las nuevas al final.
  const [lastImages, setLastImages] = useState(images);
  if (images !== lastImages) {
    setLastImages(images);
    const ids = new Set(images.map((image) => image.id));
    const kept = rows.filter((row) => ids.has(row.id));
    const keptIds = new Set(kept.map((row) => row.id));
    setRows([
      ...kept,
      ...images
        .filter((image) => !keptIds.has(image.id))
        .map(({ id, alt }) => ({ id, alt })),
    ]);
  }

  const urlById = new Map(images.map((image) => [image.id, image.url]));
  const isFull = images.length >= LIMITS.galleryImages;
  const missingAlt = rows.some((row) => row.alt.trim() === "");

  return (
    <>
      <SectionCard
        title="Galería de imágenes"
        description={`Fotos de ambiente al final de la portada. Hasta ${LIMITS.galleryImages} imágenes.`}
        hiddenReason={galleryHiddenReason({ images })}
        dirty={isDirty({ texts, rows }, { texts: { title, subtitle }, rows: savedRows })}
        pending={pending}
        onSave={() => {
          if (missingAlt) {
            toast.error("Todas las imágenes necesitan texto alternativo.");
            return;
          }
          save({ section: "gallery", ...texts, images: rows });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="gallery-title">Título</Label>
            <Input
              id="gallery-title"
              value={texts.title}
              maxLength={LIMITS.galleryTitle}
              placeholder="Galería"
              onChange={(event) => setTexts({ ...texts, title: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gallery-subtitle">Subtítulo</Label>
            <Input
              id="gallery-subtitle"
              value={texts.subtitle}
              maxLength={LIMITS.gallerySubtitle}
              onChange={(event) => setTexts({ ...texts, subtitle: event.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {images.length} de {LIMITS.galleryImages} imágenes
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFull}
            onClick={() => setAddOpen(true)}
          >
            <ImagePlus />
            Agregar imagen
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
            <Images className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Sin imágenes, la galería no aparece en la tienda.
            </p>
          </div>
        ) : (
          <ol className="divide-y rounded-lg border" aria-label="Imágenes de la galería en orden">
            {rows.map((row, index) => {
              const url = urlById.get(row.id);
              const label = row.alt.trim() || `Imagen ${index + 1}`;
              return (
                <li key={row.id} className="flex items-center gap-3 p-2">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {url && <Image src={url} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-1">
                    <Label htmlFor={`alt-${row.id}`} className="text-xs text-muted-foreground">
                      Texto alternativo
                    </Label>
                    <Input
                      id={`alt-${row.id}`}
                      value={row.alt}
                      maxLength={LIMITS.alt}
                      required
                      aria-invalid={row.alt.trim() === "" ? true : undefined}
                      onChange={(event) =>
                        setRows(
                          rows.map((item) =>
                            item.id === row.id ? { ...item, alt: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <ReorderButtons
                    itemLabel={label}
                    index={index}
                    count={rows.length}
                    onMove={(direction) => setRows(moveItem(rows, index, direction))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar ${label}`}
                    onClick={() => setRemoving(row)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>

      <AddImageDialog open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDeleteDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Quitar la imagen de la galería?"
        description="Se quita del borrador. La tienda la sigue mostrando hasta que publiques."
        confirmLabel="Quitar"
        action={removeStorefrontImage}
        fields={{ slot: "gallery", imageId: removing?.id ?? "" }}
        successMessage="Imagen quitada del borrador"
      />
    </>
  );
}
