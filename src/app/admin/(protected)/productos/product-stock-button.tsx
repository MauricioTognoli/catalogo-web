"use client";

import { useState } from "react";
import type { StockSummary } from "@/lib/stock/availability";
import { StockBadge } from "@/components/admin/stock-badge";
import { InventoryDialog, type InventoryProduct } from "./inventory-dialog";

/** Estado de stock clickeable: abre el ajuste rápido. */
export function ProductStockButton({
  product,
  summary,
}: {
  product: InventoryProduct;
  summary: StockSummary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ajustar stock de ${product.name}`}
        className="inline-flex flex-col items-start gap-0.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <StockBadge summary={summary} className="cursor-pointer hover:bg-accent" />
        {summary.managedBySize && (
          <span className="text-xs text-muted-foreground">
            {product.sizes.length} {product.sizes.length === 1 ? "talle" : "talles"}
          </span>
        )}
      </button>
      <InventoryDialog product={product} open={open} onOpenChange={setOpen} />
    </>
  );
}
