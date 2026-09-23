"use client";

import { useActionState, useState } from "react";
import {
  deleteProductSize,
  type ProductSizeActionState,
} from "@/actions/productSizes";

const initialState: ProductSizeActionState = { error: null };

export function DeleteSizeButton({
  productId,
  sizeId,
  sizeLabel,
}: {
  productId: string;
  sizeId: string;
  sizeLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteProductSize,
    initialState,
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 hover:underline dark:text-red-400"
      >
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex items-center gap-2 text-sm">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="sizeId" value={sizeId} />
        <span>¿Eliminar &quot;{sizeLabel}&quot;?</span>
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
