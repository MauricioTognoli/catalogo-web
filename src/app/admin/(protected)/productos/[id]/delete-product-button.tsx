"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Eliminar
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Eliminar "${productName}"?`}
        description="Se borran también sus fotos y talles. Esta acción no se puede deshacer. Si solo querés sacarlo de la tienda, ocultalo."
        action={deleteProduct}
        fields={{ productId }}
        successMessage="Producto eliminado"
        onDeleted={() => router.push("/admin/productos")}
      />
    </>
  );
}
