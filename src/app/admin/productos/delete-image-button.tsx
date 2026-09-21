"use client";

import { useActionState, useState } from "react";
import {
  deleteProductImage,
  type ProductImageActionState,
} from "@/actions/productImages";

const initialState: ProductImageActionState = { error: null };

export function DeleteImageButton({
  productId,
  imageId,
}: {
  productId: string;
  imageId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteProductImage,
    initialState,
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-red-600 hover:underline dark:text-red-400"
      >
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <form action={formAction} className="flex items-center gap-2 text-xs">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="imageId" value={imageId} />
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
