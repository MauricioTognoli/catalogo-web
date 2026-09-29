"use client";

import { useState } from "react";
import { Gem, X } from "lucide-react";
import { LIMITS } from "@/lib/storefront/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ReorderButtons, moveItem } from "./reorder-buttons";
import { SectionCard } from "./section-card";
import { isDirty, useSaveSection } from "./use-save-section";

export type FeaturedOption = {
  id: string;
  name: string;
  available: boolean;
  coverUrl: string | null;
};

export function FeaturedEditor({
  productIds,
  products,
}: {
  productIds: string[];
  products: FeaturedOption[];
}) {
  const [selected, setSelected] = useState(productIds);
  const { save, pending } = useSaveSection();
  // Radix Select se resetea con una key nueva tras cada elección.
  const [pickerKey, setPickerKey] = useState(0);

  const byId = new Map(products.map((product) => [product.id, product]));
  const available = products.filter((product) => !selected.includes(product.id));
  const visibleCount = selected.filter((id) => byId.get(id)?.available).length;
  const isFull = selected.length >= LIMITS.featuredProducts;

  return (
    <SectionCard
      title="Productos destacados"
      description={`Tu selección, en el orden que elijas. Hasta ${LIMITS.featuredProducts} productos.`}
      hiddenReason={visibleCount === 0 ? "No hay productos visibles elegidos." : null}
      dirty={isDirty(selected, productIds)}
      pending={pending}
      onSave={() => save({ section: "featured", productIds: selected })}
    >
      <div className="grid gap-2">
        <Label htmlFor="featured-picker">Agregar producto</Label>
        <Select
          key={pickerKey}
          disabled={isFull || available.length === 0}
          onValueChange={(id) => {
            setSelected([...selected, id]);
            setPickerKey((key) => key + 1);
          }}
        >
          <SelectTrigger id="featured-picker" className="w-full sm:w-80">
            <SelectValue
              placeholder={
                isFull
                  ? "Llegaste al máximo de destacados"
                  : available.length === 0
                    ? "No quedan productos para agregar"
                    : "Elegí un producto"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
                {!product.available && " (oculto)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
          <Gem className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Sin destacados, la sección no aparece en la tienda.
          </p>
        </div>
      ) : (
        <ol className="divide-y rounded-lg border" aria-label="Productos destacados en orden">
          {selected.map((id, index) => {
            const product = byId.get(id);
            const name = product?.name ?? "Producto eliminado";
            return (
              <li key={id} className="flex items-center gap-3 p-2">
                <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <ProductThumbnail url={product?.coverUrl ?? null} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                {product && !product.available && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Oculto: no se muestra
                  </Badge>
                )}
                {!product && (
                  <Badge variant="outline" className="text-destructive">
                    Ya no existe
                  </Badge>
                )}
                <ReorderButtons
                  itemLabel={name}
                  index={index}
                  count={selected.length}
                  onMove={(direction) => setSelected(moveItem(selected, index, direction))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Quitar ${name} de destacados`}
                  onClick={() => setSelected(selected.filter((item) => item !== id))}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
