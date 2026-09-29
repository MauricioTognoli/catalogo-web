"use client";

import { useState } from "react";
import Link from "next/link";
import { Gem, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { CategoryFormDialog, type Category } from "./category-form-dialog";

export function CategoryRow({
  category,
  productCount,
}: {
  category: Category;
  productCount: number;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const productsHref = `/admin/productos?categoria=${category.id}`;

  return (
    <TableRow>
      <TableCell className="pl-4">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {category.name}
        </button>
        <p className="font-mono text-xs text-muted-foreground">/{category.slug}</p>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {productCount > 0 ? (
          <Link href={productsHref} className="hover:underline">
            {productCount}
          </Link>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
        {category.position}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Acciones para ${category.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={productsHref}>
                <Gem />
                Ver productos
              </Link>
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

        <CategoryFormDialog
          category={category}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`¿Eliminar "${category.name}"?`}
          description={
            productCount > 0
              ? `Sus ${productCount === 1 ? "producto no se borra" : `${productCount} productos no se borran`}: ${productCount === 1 ? "queda" : "quedan"} sin categoría.`
              : "La categoría no tiene productos."
          }
          action={deleteCategory}
          fields={{ categoryId: category.id }}
          successMessage="Categoría eliminada"
        />
      </TableCell>
    </TableRow>
  );
}
