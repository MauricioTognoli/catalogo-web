"use client";

import { useActionState, useState } from "react";
import {
  updateCategory,
  type CategoryActionState,
} from "@/actions/categories";
import { DeleteCategoryButton } from "./delete-category-button";

type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
};

const initialState: CategoryActionState = { error: null };

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCategory,
    initialState,
  );

  // Cierra el modo edición cuando el guardado termina sin error. Se ajusta
  // durante el render (patrón recomendado por React) en vez de en un
  // efecto, para evitar un ciclo extra de render.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state !== initialState && state.error === null) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-zinc-200 dark:border-zinc-800">
        <td colSpan={4} className="py-3">
          <form action={formAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="categoryId" value={category.id} />

            <div>
              <label
                htmlFor={`name-${category.id}`}
                className="block text-xs font-medium"
              >
                Nombre
              </label>
              <input
                id={`name-${category.id}`}
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                defaultValue={category.name}
                className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
              />
            </div>

            <div>
              <label
                htmlFor={`slug-${category.id}`}
                className="block text-xs font-medium"
              >
                Slug
              </label>
              <input
                id={`slug-${category.id}`}
                name="slug"
                type="text"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                aria-describedby={`slug-hint-${category.id}`}
                defaultValue={category.slug}
                className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
              />
              <p
                id={`slug-hint-${category.id}`}
                className="mt-1 text-xs text-zinc-500"
              >
                Minúsculas, números y guiones.
              </p>
            </div>

            <div>
              <label
                htmlFor={`position-${category.id}`}
                className="block text-xs font-medium"
              >
                Posición
              </label>
              <input
                id={`position-${category.id}`}
                name="position"
                type="number"
                required
                min={0}
                step={1}
                defaultValue={category.position}
                className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={pending}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Cancelar
              </button>
            </div>

            {state.error && (
              <p
                role="alert"
                className="w-full text-sm text-red-600 dark:text-red-400"
              >
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800">
      <td className="py-2">{category.name}</td>
      <td className="py-2 text-zinc-500">{category.slug}</td>
      <td className="py-2 text-zinc-500">{category.position}</td>
      <td className="py-2">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm hover:underline"
          >
            Editar
          </button>
          <DeleteCategoryButton
            categoryId={category.id}
            categoryName={category.name}
          />
        </div>
      </td>
    </tr>
  );
}
