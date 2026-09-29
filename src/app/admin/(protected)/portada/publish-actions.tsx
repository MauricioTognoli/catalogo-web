"use client";

import { useState } from "react";
import { Eye, RotateCcw, Send } from "lucide-react";
import { discardStorefrontDraft, publishStorefront } from "@/actions/storefront";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export function PublishActions({ hasChanges }: { hasChanges: boolean }) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  return (
    <>
      <Button asChild variant="outline">
        {/* <a>: route handler que activa la vista previa y abre la tienda. */}
        <a href="/admin/portada/vista-previa" target="_blank" rel="noopener">
          <Eye />
          Vista previa
        </a>
      </Button>
      {hasChanges && (
        <Button variant="ghost" onClick={() => setDiscardOpen(true)}>
          <RotateCcw />
          Descartar
        </Button>
      )}
      <Button disabled={!hasChanges} onClick={() => setPublishOpen(true)}>
        <Send />
        Publicar
      </Button>

      <ConfirmDeleteDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="¿Publicar la portada?"
        description="Tus clientes van a ver los cambios del borrador en la tienda a partir de ahora."
        confirmLabel="Publicar"
        pendingLabel="Publicando..."
        destructive={false}
        action={publishStorefront}
        fields={{}}
        successMessage="Portada publicada"
      />
      <ConfirmDeleteDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="¿Descartar los cambios?"
        description="El borrador vuelve a ser igual a lo publicado. Se pierden los textos e imágenes que no publicaste."
        confirmLabel="Descartar cambios"
        pendingLabel="Descartando..."
        action={discardStorefrontDraft}
        fields={{}}
        successMessage="Cambios descartados"
      />
    </>
  );
}
