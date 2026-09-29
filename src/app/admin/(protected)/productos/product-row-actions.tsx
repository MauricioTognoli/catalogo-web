"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export function ProductRowActions({
  product,
}: {
  product: { id: string; name: string; slug: string; available: boolean };
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Acciones para ${product.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/admin/productos/${product.id}`}>
              <Pencil />
              Editar
            </Link>
          </DropdownMenuItem>
          {product.available && (
            <DropdownMenuItem asChild>
              <a
                href={`/productos/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Ver en la tienda
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar "${product.name}"?`}
        description="Se borran también sus fotos y talles. Esta acción no se puede deshacer. Si solo querés sacarlo de la tienda, ocultalo."
        action={deleteProduct}
        fields={{ productId: product.id }}
        successMessage="Producto eliminado"
      />
    </>
  );
}
