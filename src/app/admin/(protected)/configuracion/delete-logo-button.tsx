"use client";

import { useActionState, useState } from "react";
import {
  deleteBusinessLogo,
  type BusinessLogoActionState,
} from "@/actions/business";

const initialState: BusinessLogoActionState = { error: null };

export function DeleteLogoButton() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteBusinessLogo,
    initialState,
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 hover:underline dark:text-red-400"
      >
        Eliminar logo
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction} className="flex items-center gap-2 text-sm">
        <span>¿Eliminar el logo?</span>
        <button
          type="submit"
          disabled={pending}
          className="font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
        >
          {pending ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="text-zinc-500 disabled:opacity-50"
        >
          Cancelar
        </button>
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
