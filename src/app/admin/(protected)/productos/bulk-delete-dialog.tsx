"use client";

import { useRef, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProducts, type DeleteProductsState } from "@/actions/products";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const UNEXPECTED_ERROR: DeleteProductsState = {
  error: "No se pudieron eliminar los productos. Probá de nuevo.",
  deletedIds: [],
  failed: [],
};

function productsLabel(count: number) {
  return count === 1 ? "1 producto" : `${count} productos`;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  productIds,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onFinished: (result: DeleteProductsState) => void;
}) {
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const count = productIds.length;

  function confirm() {
    if (inFlight.current || count === 0) return;
    inFlight.current = true;

    startTransition(async () => {
      const result = await deleteProducts(productIds).catch(() => UNEXPECTED_ERROR);
      inFlight.current = false;

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.failed.length === 0) {
        toast.success(
          count === 1
            ? "Producto eliminado"
            : `Se eliminaron ${result.deletedIds.length} productos`,
        );
      } else {
        toast.error(
          `Se eliminaron ${result.deletedIds.length} de ${count}. ${productsLabel(result.failed.length)} no se pudieron eliminar.`,
        );
      }

      onOpenChange(false);
      onFinished(result);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {productsLabel(count)}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se {count === 1 ? "borra" : "borran"} {productsLabel(count)} junto con
            sus fotos y talles. Esta acción no se puede deshacer. Si solo querés
            sacarlos de la tienda, ocultalos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || count === 0}
            aria-busy={pending}
            onClick={confirm}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Eliminando..." : "Eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
