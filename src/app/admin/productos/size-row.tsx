"use client";

import { useActionState, useState, type DragEvent } from "react";
import {
  updateProductSize,
  type ProductSizeActionState,
} from "@/actions/productSizes";
import { ToggleSizeAvailabilityButton } from "./toggle-size-availability-button";
import { DeleteSizeButton } from "./delete-size-button";

type ProductSize = {
  id: string;
  label: string;
  available: boolean;
  position: number;
};

const initialState: ProductSizeActionState = { error: null };

export function SizeRow({
  productId,
  size,
  index,
  isFirst,
  isLast,
  isReordering,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  productId: string;
  size: ProductSize;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateProductSize,
    initialState,
  );

  // Cierra el modo edición al guardar sin error, ajustando el estado
  // durante el render en vez de en un efecto (mismo patrón que CategoryRow).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state !== initialState && state.error === null) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="sizeId" value={size.id} />

          <div>
            <label
              htmlFor={`size-label-${size.id}`}
              className="block text-xs font-medium"
            >
              Talle
            </label>
            <input
              id={`size-label-${size.id}`}
              name="label"
              type="text"
              required
              minLength={1}
              maxLength={30}
              defaultValue={size.label}
              className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id={`size-available-${size.id}`}
              name="available"
              type="checkbox"
              defaultChecked={size.available}
              className="h-4 w-4"
            />
            <label
              htmlFor={`size-available-${size.id}`}
              className="text-sm font-medium"
            >
              Disponible
            </label>
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
      </li>
    );
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={isFirst || isReordering}
            aria-label={`Mover talle ${size.label} hacia arriba`}
            className="rounded border border-zinc-300 px-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={isLast || isReordering}
            aria-label={`Mover talle ${size.label} hacia abajo`}
            className="rounded border border-zinc-300 px-1.5 text-xs disabled:opacity-40 dark:border-zinc-700"
          >
            ↓
          </button>
        </div>

        <span className="font-medium">{size.label}</span>

        <ToggleSizeAvailabilityButton
          productId={productId}
          sizeId={size.id}
          available={size.available}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm hover:underline"
        >
          Editar
        </button>
        <DeleteSizeButton
          productId={productId}
          sizeId={size.id}
          sizeLabel={size.label}
        />
      </div>
    </li>
  );
}
