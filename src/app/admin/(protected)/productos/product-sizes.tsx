"use client";

import { useRef, useState } from "react";
import { reorderProductSizes } from "@/actions/productSizes";
import { CreateSizeForm } from "./create-size-form";
import { SizeRow } from "./size-row";

type ProductSize = {
  id: string;
  label: string;
  available: boolean;
  position: number;
};

export function ProductSizes({
  productId,
  sizes,
}: {
  productId: string;
  sizes: ProductSize[];
}) {
  // Copia local para reordenar de forma optimista, resincronizada cuando
  // el servidor manda una lista nueva (mismo patrón que ProductImages).
  const [lastSizes, setLastSizes] = useState(sizes);
  const [orderedSizes, setOrderedSizes] = useState(sizes);
  if (sizes !== lastSizes) {
    setLastSizes(sizes);
    setOrderedSizes(sizes);
  }

  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  async function persistOrder(newOrder: ProductSize[]) {
    setOrderedSizes(newOrder);
    setIsReordering(true);
    setReorderError(null);

    const result = await reorderProductSizes(
      productId,
      newOrder.map((size) => size.id),
    );

    if (result.error) {
      setReorderError(result.error);
      setOrderedSizes(sizes);
    }

    setIsReordering(false);
  }

  function moveSize(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedSizes.length) return;

    const next = [...orderedSizes];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    void persistOrder(next);
  }

  function handleDrop(targetIndex: number) {
    const sourceIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const next = [...orderedSizes];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistOrder(next);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Talles</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Opcional: un producto puede no tener talles, tener uno o varios.
        </p>
      </div>

      <CreateSizeForm productId={productId} />

      {reorderError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {reorderError}
        </p>
      )}

      {orderedSizes.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Este producto no tiene talles configurados.
        </div>
      ) : (
        <ul className="space-y-2">
          {orderedSizes.map((size, index) => (
            <SizeRow
              key={size.id}
              productId={productId}
              size={size}
              index={index}
              isFirst={index === 0}
              isLast={index === orderedSizes.length - 1}
              isReordering={isReordering}
              onMove={moveSize}
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
