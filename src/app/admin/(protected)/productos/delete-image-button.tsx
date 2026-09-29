"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductImage } from "@/actions/productImages";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export function DeleteImageButton({
  productId,
  imageId,
}: {
  productId: string;
  imageId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label="Eliminar imagen"
      >
        <Trash2 />
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar esta imagen?"
        description="Se quita del producto y de la tienda. Esta acción no se puede deshacer."
        action={deleteProductImage}
        fields={{ productId, imageId }}
        successMessage="Imagen eliminada"
      />
    </>
  );
}
