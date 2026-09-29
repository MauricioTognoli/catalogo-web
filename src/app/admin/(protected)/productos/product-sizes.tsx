"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { reorderProductSizes } from "@/actions/productSizes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateSizeForm } from "./create-size-form";
import { SizeRow } from "./size-row";

type ProductSize = {
  id: string;
  label: string;
  available: boolean;
  stock: number | null;
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
  const dragIndexRef = useRef<number | null>(null);

  async function persistOrder(newOrder: ProductSize[]) {
    setOrderedSizes(newOrder);
    setIsReordering(true);

    const result = await reorderProductSizes(
      productId,
      newOrder.map((size) => size.id),
    );

    if (result.error) {
      toast.error(result.error);
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
    <Card>
      <CardHeader>
        <CardTitle>Talles y medidas</CardTitle>
        <CardDescription>
          Opcional. Útil para anillos, cadenas o pulseras con varias medidas.
          Si agregás talles, el cliente elige uno antes de sumarlo al carrito
          y el stock se lleva por talle. Un talle inactivo no se ofrece.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateSizeForm productId={productId} />

        {orderedSizes.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Sin talles: se vende como medida única y el stock se carga en
            Inventario, arriba.
          </p>
        ) : (
          <div>
            <div className="flex items-center justify-between border-b pb-2 text-xs font-medium text-muted-foreground">
              <span>Orden y talle</span>
              <span className="mr-10 flex gap-6">
                <span>Stock</span>
                <span>Activo</span>
              </span>
            </div>
            <ul className="divide-y">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
