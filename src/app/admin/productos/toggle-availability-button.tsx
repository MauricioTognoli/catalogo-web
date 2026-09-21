"use client";

import { useActionState } from "react";
import {
  toggleProductAvailability,
  type ProductActionState,
} from "@/actions/products";

const initialState: ProductActionState = { error: null };

export function ToggleAvailabilityButton({
  productId,
  available,
}: {
  productId: string;
  available: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleProductAvailability,
    initialState,
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="available" value={(!available).toString()} />
        <button
          type="submit"
          disabled={pending}
          aria-label={
            available
              ? "Marcar producto como no disponible"
              : "Marcar producto como disponible"
          }
          className={
            available
              ? "rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-700 disabled:opacity-50 dark:border-green-500 dark:text-green-400"
              : "rounded border border-zinc-400 px-2 py-1 text-xs font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400"
          }
        >
          {pending
            ? "Actualizando..."
            : available
              ? "Disponible"
              : "No disponible"}
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
