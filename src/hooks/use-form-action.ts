"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

type ActionState = { error: string | null };

type FormAction<S extends ActionState> = (
  prevState: S,
  formData: FormData,
) => Promise<S>;

type Options = {
  /** Toast al terminar sin error. Omitirlo si la acción redirige. */
  successMessage?: string;
  onSuccess?: (form: HTMLFormElement) => void;
};

/**
 * Envía un formulario a una Server Action con firma de useActionState
 * y da feedback con toasts.
 *
 * Se usa `onSubmit` + `preventDefault` en lugar de `<form action>` a
 * propósito: React 19 resetea los campos no controlados después de
 * cada `<form action>`, incluso cuando el servidor devuelve un error,
 * y eso le borraba al usuario lo que había escrito.
 */
export function useFormAction<S extends ActionState>(
  action: FormAction<S>,
  { successMessage, onSuccess }: Options = {},
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await action({ error: null } as S, formData);

      // Una acción que hace redirect() no devuelve estado: la navegación
      // la resuelve el router de Next.
      if (!result) return;

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setError(null);
      if (successMessage) toast.success(successMessage);
      onSuccess?.(form);
    });
  }

  return { handleSubmit, pending, error };
}
