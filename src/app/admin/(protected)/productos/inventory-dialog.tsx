"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { updateInventory } from "@/actions/stock";
import { MAX_STOCK } from "@/lib/stock/availability";
import { useFormAction } from "@/hooks/use-form-action";
import { Badge } from "@/components/ui/badge";
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

export type InventoryProduct = {
  id: string;
  name: string;
  stock: number | null;
  sizes: { id: string; label: string; stock: number | null; available: boolean }[];
};

/**
 * Ajuste rápido de stock desde el listado: el del producto si no tiene
 * talles, o el de cada talle. Pensado para actualizar cantidades al
 * confirmar una venta por WhatsApp.
 */
export function InventoryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: InventoryProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { handleSubmit, pending } = useFormAction(updateInventory, {
    successMessage: "Stock actualizado",
    onSuccess: () => onOpenChange(false),
  });
  const managedBySize = product.sizes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>
              {product.name}
              {managedBySize && " · stock por talle"}
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="productId" value={product.id} />

          {managedBySize ? (
            <ul className="grid max-h-80 gap-3 overflow-y-auto pr-1">
              {product.sizes.map((size, index) => (
                <li
                  key={size.id}
                  className="grid grid-cols-[1fr_6.5rem] items-center gap-3"
                >
                  <Label
                    htmlFor={`inventory-${size.id}`}
                    className="min-w-0 justify-between"
                  >
                    <span className="truncate">{size.label}</span>
                    {!size.available && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactivo
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id={`inventory-${size.id}`}
                    name={`size-stock:${size.id}`}
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    max={MAX_STOCK}
                    step={1}
                    defaultValue={size.stock ?? ""}
                    placeholder="Cargar"
                    autoFocus={index === 0}
                    className="text-right tabular-nums"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={`inventory-${product.id}`}>Unidades en stock</Label>
              <Input
                id={`inventory-${product.id}`}
                name="stock"
                type="number"
                inputMode="numeric"
                required
                min={0}
                max={MAX_STOCK}
                step={1}
                defaultValue={product.stock ?? ""}
                placeholder="Cargar cantidad"
                autoFocus
                className="tabular-nums"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Los pedidos por WhatsApp no descuentan stock: actualizalo cuando
            confirmes una venta. Con 0 unidades el producto sigue visible,
            pero no se puede agregar al carrito.
          </p>

          <DialogFooter className="sm:justify-between">
            <Button asChild variant="link" className="px-0">
              <Link href={`/admin/productos/${product.id}`}>Abrir ficha</Link>
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
