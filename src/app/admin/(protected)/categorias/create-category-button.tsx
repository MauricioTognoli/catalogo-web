"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryFormDialog } from "./category-form-dialog";

export function CreateCategoryButton({
  defaultOpen = false,
  label = "Nueva categoría",
  variant,
}: {
  /** Abre el modal al cargar (links "Nueva categoría" de otras pantallas). */
  defaultOpen?: boolean;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const [open, setOpen] = useState(defaultOpen);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Quita ?nueva=1 para que recargar no vuelva a abrir el modal.
    if (!next && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <FolderPlus />
        {label}
      </Button>
      <CategoryFormDialog open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
