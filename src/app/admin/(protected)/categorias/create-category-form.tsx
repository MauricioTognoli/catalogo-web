"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createCategory,
  type CategoryActionState,
} from "@/actions/categories";

const initialState: CategoryActionState = { error: null };

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(
    createCategory,
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
      <div>
        <label htmlFor="new-category-name" className="block text-sm font-medium">
          Nombre de la categoría
        </label>
        <input
          id="new-category-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          aria-describedby="new-category-hint"
          className="mt-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="new-category-hint" className="mt-1 text-xs text-zinc-500">
          El slug se genera automáticamente a partir del nombre.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Creando..." : "Crear categoría"}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
