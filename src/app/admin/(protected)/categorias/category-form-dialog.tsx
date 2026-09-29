"use client";

import { Loader2 } from "lucide-react";
import { createCategory, updateCategory } from "@/actions/categories";
import { useFormAction } from "@/hooks/use-form-action";
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

export type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
};

/** Alta (solo nombre, el slug se genera) o edición completa. */
export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = category !== undefined;
  const { handleSubmit, pending } = useFormAction(
    isEdit ? updateCategory : createCategory,
    {
      successMessage: isEdit ? "Categoría actualizada" : "Categoría creada",
      onSuccess: () => onOpenChange(false),
    },
  );
  const idPrefix = category?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Cambiar el slug modifica la URL pública de la categoría."
                : "Por ejemplo: Anillos, Aros, Collares, Pulseras."}
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="categoryId" value={category.id} />}

          <div className="grid gap-2">
            <Label htmlFor={`category-name-${idPrefix}`}>Nombre</Label>
            <Input
              id={`category-name-${idPrefix}`}
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              defaultValue={category?.name}
              autoFocus
            />
          </div>

          {isEdit && (
            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <div className="grid gap-2">
                <Label htmlFor={`category-slug-${idPrefix}`}>Slug</Label>
                <Input
                  id={`category-slug-${idPrefix}`}
                  name="slug"
                  type="text"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  defaultValue={category.slug}
                  aria-describedby={`category-slug-hint-${idPrefix}`}
                  className="font-mono text-sm"
                />
                <p
                  id={`category-slug-hint-${idPrefix}`}
                  className="text-xs text-muted-foreground"
                >
                  Minúsculas, números y guiones.
                </p>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor={`category-position-${idPrefix}`}>Posición</Label>
                <Input
                  id={`category-position-${idPrefix}`}
                  name="position"
                  type="number"
                  required
                  min={0}
                  step={1}
                  defaultValue={category.position}
                  className="tabular-nums"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isEdit
                ? pending
                  ? "Guardando..."
                  : "Guardar"
                : pending
                  ? "Creando..."
                  : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
