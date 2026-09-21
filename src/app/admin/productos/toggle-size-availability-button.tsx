"use client";

import { useActionState } from "react";
import {
  toggleProductSizeAvailability,
  type ProductSizeActionState,
} from "@/actions/productSizes";

const initialState: ProductSizeActionState = { error: null };

export function ToggleSizeAvailabilityButton({
  productId,
  sizeId,
  available,
}: {
  productId: string;
  sizeId: string;
  available: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleProductSizeAvailability,
    initialState,
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="sizeId" value={sizeId} />
        <input type="hidden" name="available" value={(!available).toString()} />
        <button
          type="submit"
          disabled={pending}
          aria-label={
            available
              ? "Marcar talle como no disponible"
              : "Marcar talle como disponible"
          }
          className={
            available
              ? "rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-700 disabled:opacity-50 dark:border-green-500 dark:text-green-400"
              : "rounded border border-zinc-400 px-2 py-1 text-xs font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400"
          }
        >
          {pending ? "..." : available ? "Disponible" : "No disponible"}
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
