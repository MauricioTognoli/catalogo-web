"use client";

import { useActionState, useState } from "react";
import { updateBusiness, type UpdateBusinessState } from "@/actions/business";
import type { Business } from "@/lib/business/getCurrentBusiness";

const initialState: UpdateBusinessState = { error: null };

export function EditBusinessForm({ business }: { business: Business }) {
  const [state, formAction, pending] = useActionState(
    updateBusiness,
    initialState,
  );

  // Mensaje de éxito temporal: se activa cuando la action devuelve sin
  // error, ajustando el estado durante el render (mismo patrón que
  // CategoryRow/ProductImages) en vez de un efecto.
  const [showSuccess, setShowSuccess] = useState(false);
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    setShowSuccess(state !== initialState && state.error === null);
  }

  return (
    <form
      action={formAction}
      onChange={() => setShowSuccess(false)}
      className="w-full max-w-sm space-y-4"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nombre del negocio
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={business.name}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div>
        <label htmlFor="whatsapp_number" className="block text-sm font-medium">
          WhatsApp
        </label>
        <input
          id="whatsapp_number"
          name="whatsapp_number"
          type="tel"
          required
          pattern="\d{6,15}"
          defaultValue={business.whatsapp_number}
          aria-describedby="whatsapp-hint"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="whatsapp-hint" className="mt-1 text-xs text-zinc-500">
          Solo números, con código de país. Ej: 5491122334455
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {showSuccess && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
