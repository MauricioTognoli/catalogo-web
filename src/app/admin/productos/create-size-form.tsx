"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createProductSize,
  type ProductSizeActionState,
} from "@/actions/productSizes";

const initialState: ProductSizeActionState = { error: null };

export function CreateSizeForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    createProductSize,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <input type="hidden" name="productId" value={productId} />

      <div>
        <label htmlFor="new-size-label" className="block text-sm font-medium">
          Talle
        </label>
        <input
          id="new-size-label"
          name="label"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="Ej: S, M, 40, Único"
          aria-describedby="new-size-hint"
          className="mt-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="new-size-hint" className="mt-1 text-xs text-zinc-500">
          Cualquier texto corto: XS, M, 40, Único, etc.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="new-size-available"
          name="available"
          type="checkbox"
          defaultChecked
          className="h-4 w-4"
        />
        <label htmlFor="new-size-available" className="text-sm font-medium">
          Disponible
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Agregando..." : "Agregar talle"}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
