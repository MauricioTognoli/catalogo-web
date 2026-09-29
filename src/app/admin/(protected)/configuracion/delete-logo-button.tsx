"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteBusinessLogo } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export function DeleteLogoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Quitar
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Quitar el logo?"
        description="La tienda va a mostrar la inicial del negocio en su lugar."
        confirmLabel="Quitar logo"
        action={deleteBusinessLogo}
        fields={{}}
        successMessage="Logo eliminado"
      />
    </>
  );
}
