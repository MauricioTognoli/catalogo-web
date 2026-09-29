"use client";

import { Loader2 } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
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

type ActionState = { error: string | null };

/**
 * Confirmación de borrado controlada. Envía `fields` como FormData a la
 * Server Action y solo se cierra cuando el servidor confirma, así un error
 * queda visible (toast) sin perder el contexto.
 */
export function ConfirmDeleteDialog<S extends ActionState>({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  action,
  fields,
  successMessage,
  onDeleted,
  pendingLabel = "Eliminando...",
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  action: (prevState: S, formData: FormData) => Promise<S>;
  fields: Record<string, string>;
  successMessage: string;
  onDeleted?: () => void;
  /** Para confirmar acciones que no borran (ej: publicar). */
  pendingLabel?: string;
  destructive?: boolean;
}) {
  const { handleSubmit, pending } = useFormAction(action, {
    successMessage,
    onSuccess: () => {
      onOpenChange(false);
      onDeleted?.();
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
