"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, PackagePlus, Search, SearchX, X } from "lucide-react";
import { formatPrice } from "@/lib/utils/formatPrice";
import {
  ALL_CATEGORIES,
  PRODUCT_STATUS_FILTERS,
  filterProducts,
  type ProductStatusFilter,
} from "@/lib/admin/product-filters";
import type { StockState, StockSummary } from "@/lib/stock/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ProductAvailabilitySwitch } from "./product-availability-switch";
import { ProductRowActions } from "./product-row-actions";
import { ProductStockButton } from "./product-stock-button";

export type ProductTableRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  material: string | null;
  available: boolean;
  categoryId: string | null;
  categoryName: string | null;
  imageCount: number;
  coverUrl: string | null;
  stock: number | null;
  sizes: { id: string; label: string; stock: number | null; available: boolean }[];
  stockSummary: StockSummary;
  stockState: StockState;
};

type Category = { id: string; name: string };

/**
 * Refleja los filtros en la URL sin pedirle nada al servidor (el listado
 * ya está completo en el cliente). Next integra history.replaceState con
 * useSearchParams, y así los links del dashboard y el "atrás" funcionan.
 */
function syncUrl(query: string, categoryId: string, status: ProductStatusFilter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (categoryId !== ALL_CATEGORIES) params.set("categoria", categoryId);
  if (status !== "todos") params.set("estado", status);
  const search = params.toString();
  window.history.replaceState(
    null,
    "",
    search ? `?${search}` : window.location.pathname,
  );
}

export function ProductsTable({
  products,
  categories,
  initialQuery,
  initialCategoryId,
  initialStatus,
}: {
  products: ProductTableRow[];
  categories: Category[];
  initialQuery: string;
  initialCategoryId: string;
  initialStatus: ProductStatusFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [status, setStatus] = useState<ProductStatusFilter>(initialStatus);

  const filtered = useMemo(
    () => filterProducts(products, { query, categoryId, status }),
    [products, query, categoryId, status],
  );

  const hasFilters =
    query !== "" || categoryId !== ALL_CATEGORIES || status !== "todos";

  function update(next: {
    query?: string;
    categoryId?: string;
    status?: ProductStatusFilter;
  }) {
    const nextQuery = next.query ?? query;
    const nextCategoryId = next.categoryId ?? categoryId;
    const nextStatus = next.status ?? status;
    setQuery(nextQuery);
    setCategoryId(nextCategoryId);
    setStatus(nextStatus);
    syncUrl(nextQuery, nextCategoryId, nextStatus);
  }

  function clearFilters() {
    update({ query: "", categoryId: ALL_CATEGORIES, status: "todos" });
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Todavía no cargaste productos"
        description="Creá el primero con nombre y precio, o cargá varios juntos desde una planilla de Excel."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <PackagePlus />
                Crear producto
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/productos/importar">
                <FileSpreadsheet />
                Importar desde Excel
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Buscar por nombre, material o categoría"
            aria-label="Buscar productos"
            className="pl-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Select
            value={categoryId}
            onValueChange={(value) => update({ categoryId: value })}
          >
            <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) =>
              update({ status: value as ProductStatusFilter })
            }
          >
            <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex min-h-8 items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite">
          {hasFilters
            ? `${filtered.length} de ${products.length} productos`
            : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X />
            Limpiar filtros
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No hay productos que coincidan"
          description="Probá con otra búsqueda o cambiá los filtros."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* Móvil: tarjetas. Una tabla de 5 columnas no entra en 360px. */}
          <ul className="divide-y rounded-xl border md:hidden">
            {filtered.map((product) => (
              <li key={product.id} className="flex items-center gap-3 p-3">
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ProductThumbnail url={product.coverUrl} className="size-12" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <span className="tabular-nums">{formatPrice(product.price)}</span>
                      {product.categoryName && ` · ${product.categoryName}`}
                    </p>
                  </div>
                </Link>
                <ProductStockButton product={product} summary={product.stockSummary} />
                <ProductAvailabilitySwitch
                  productId={product.id}
                  productName={product.name}
                  available={product.available}
                />
                <ProductRowActions product={product} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-32">Stock</TableHead>
                  <TableHead className="w-28">Visible</TableHead>
                  <TableHead className="w-14 pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="flex items-center gap-3 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <ProductThumbnail url={product.coverUrl} />
                        <div className="min-w-0">
                          <p className="max-w-xs truncate font-medium hover:underline">
                            {product.name}
                          </p>
                          {product.material && (
                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                              {product.material}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {product.categoryName ?? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sin categoría
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(product.price)}
                    </TableCell>
                    <TableCell>
                      <ProductStockButton
                        product={product}
                        summary={product.stockSummary}
                      />
                    </TableCell>
                    <TableCell>
                      <ProductAvailabilitySwitch
                        productId={product.id}
                        productName={product.name}
                        available={product.available}
                      />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ProductRowActions product={product} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
