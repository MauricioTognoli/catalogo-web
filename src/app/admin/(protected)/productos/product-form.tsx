"use client";

import { useActionState } from "react";
import type { ProductActionState } from "@/actions/products";

type Category = {
  id: string;
  name: string;
};

type ProductFormDefaults = {
  productId?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  material?: string | null;
  available?: boolean;
  categoryId?: string | null;
};

type ProductFormProps = {
  action: (
    state: ProductActionState,
    formData: FormData,
  ) => Promise<ProductActionState>;
  categories: Category[];
  submitLabel: string;
  pendingLabel: string;
  showSlugField?: boolean;
  defaultValues?: ProductFormDefaults;
};

const initialState: ProductActionState = { error: null };

export function ProductForm({
  action,
  categories,
  submitLabel,
  pendingLabel,
  showSlugField = false,
  defaultValues,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {defaultValues?.productId && (
        <input type="hidden" name="productId" value={defaultValues.productId} />
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      {showSlugField ? (
        <div>
          <label htmlFor="slug" className="block text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={defaultValues?.slug}
            aria-describedby="slug-hint"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
          />
          <p id="slug-hint" className="mt-1 text-xs text-zinc-500">
            Minúsculas, números y guiones.
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          El slug se genera automáticamente a partir del nombre.
        </p>
      )}

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={defaultValues?.description ?? ""}
          aria-describedby="description-hint"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="description-hint" className="mt-1 text-xs text-zinc-500">
          Opcional, hasta 2000 caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium">
          Precio
        </label>
        <input
          id="price"
          name="price"
          type="number"
          required
          min={0}
          step="0.01"
          defaultValue={defaultValues?.price}
          aria-describedby="price-hint"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="price-hint" className="mt-1 text-xs text-zinc-500">
          En pesos argentinos, sin símbolo (ej: 15000.50).
        </p>
      </div>

      <div>
        <label htmlFor="material" className="block text-sm font-medium">
          Material
        </label>
        <input
          id="material"
          name="material"
          type="text"
          maxLength={120}
          defaultValue={defaultValues?.material ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div>
        <label htmlFor="category_id" className="block text-sm font-medium">
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultValues?.categoryId ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-transparent"
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="available"
          name="available"
          type="checkbox"
          defaultChecked={defaultValues?.available ?? true}
          className="h-4 w-4"
        />
        <label htmlFor="available" className="text-sm font-medium">
          Disponible
        </label>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
