"use client";

import { useState, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteProductSize, updateProductSize } from "@/actions/productSizes";
import { useFormAction } from "@/hooks/use-form-action";
import { MAX_STOCK } from "@/lib/stock/availability";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { SizeAvailabilitySwitch } from "./size-availability-switch";
import { cn } from "@/lib/utils/cn";

type ProductSize = {
  id: string;
  label: string;
  available: boolean;
  stock: number | null;
  position: number;
};

function EditSizeDialog({
  productId,
  size,
  open,
  onOpenChange,
}: {
  productId: string;
  size: ProductSize;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { handleSubmit, pending } = useFormAction(updateProductSize, {
    successMessage: "Talle actualizado",
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Editar talle</DialogTitle>
            <DialogDescription>
              Los cambios se ven en la tienda al instante.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="sizeId" value={size.id} />

          <div className="grid gap-2">
            <Label htmlFor={`size-label-${size.id}`}>Talle</Label>
            <Input
              id={`size-label-${size.id}`}
              name="label"
              type="text"
              required
              minLength={1}
              maxLength={30}
              defaultValue={size.label}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`size-stock-${size.id}`}>Stock</Label>
            <Input
              id={`size-stock-${size.id}`}
              name="stock"
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={MAX_STOCK}
              step={1}
              defaultValue={size.stock ?? ""}
              placeholder="Cargar cantidad"
              className="tabular-nums"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`size-available-${size.id}`}>Activo</Label>
            <Switch
              id={`size-available-${size.id}`}
              name="available"
              defaultChecked={size.available}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SizeRow({
  productId,
  size,
  index,
  isFirst,
  isLast,
  isReordering,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  productId: string;
  size: ProductSize;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <li
      draggable={!isReordering}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-2 py-2"
    >
      <GripVertical
        className="hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block"
        aria-hidden="true"
      />
      <div className="flex shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onMove(index, -1)}
          disabled={isFirst || isReordering}
          aria-label={`Mover talle ${size.label} hacia arriba`}
        >
          <ChevronUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onMove(index, 1)}
          disabled={isLast || isReordering}
          aria-label={`Mover talle ${size.label} hacia abajo`}
        >
          <ChevronDown />
        </Button>
      </div>

      <span className="min-w-0 flex-1 truncate font-medium">{size.label}</span>

      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Editar stock del talle ${size.label}`}
        className={cn(
          "w-16 rounded-md px-1 py-1 text-right text-sm tabular-nums outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
          size.stock === null && "text-muted-foreground",
          size.stock === 0 && "font-medium text-destructive",
        )}
      >
        {size.stock === null ? "Cargar" : size.stock === 0 ? "Sin stock" : `${size.stock} u.`}
      </button>

      <SizeAvailabilitySwitch
        productId={productId}
        sizeId={size.id}
        sizeLabel={size.label}
        available={size.available}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Acciones para el talle ${size.label}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditSizeDialog
        productId={productId}
        size={size}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar el talle "${size.label}"?`}
        description="Deja de ofrecerse en la tienda. Si es algo temporal, podés marcarlo como no disponible."
        action={deleteProductSize}
        fields={{ productId, sizeId: size.id }}
        successMessage="Talle eliminado"
      />
    </li>
  );
}
