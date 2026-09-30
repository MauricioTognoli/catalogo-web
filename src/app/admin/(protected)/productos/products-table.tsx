"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  PackagePlus,
  Search,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils/formatPrice";
import {
  ALL_CATEGORIES,
  PRODUCT_STATUS_FILTERS,
  filterProducts,
  type ProductStatusFilter,
} from "@/lib/admin/product-filters";
import {
  selectAllState,
  selectedVisibleIds,
  selectionAfterDelete,
  toggleAllVisible,
  toggleOne,
} from "@/lib/admin/product-selection";
import type { DeleteProductsState } from "@/actions/products";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BulkDeleteDialog } from "./bulk-delete-dialog";

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

function bulkFailureTitle(deleted: number, failed: number) {
  const failedText =
    failed === 1 ? "1 producto no se pudo eliminar" : `${failed} productos no se pudieron eliminar`;
  if (deleted === 0) return `No se eliminó ningún producto: ${failedText}.`;
  const deletedText =
    deleted === 1 ? "Se eliminó 1 producto" : `Se eliminaron ${deleted} productos`;
  return `${deletedText}, pero ${failedText}.`;
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkFailure, setBulkFailure] = useState<{
    deleted: number;
    failedNames: string[];
  } | null>(null);

  const initialFilters = `${initialQuery}|${initialCategoryId}|${initialStatus}`;
  const [appliedInitialFilters, setAppliedInitialFilters] = useState(initialFilters);
  if (initialFilters !== appliedInitialFilters) {
    setAppliedInitialFilters(initialFilters);
    if (initialFilters !== `${query}|${categoryId}|${status}`) {
      setQuery(initialQuery);
      setCategoryId(initialCategoryId);
      setStatus(initialStatus);
      setSelected(new Set());
      setBulkFailure(null);
    }
  }

  const filtered = useMemo(
    () => filterProducts(products, { query, categoryId, status }),
    [products, query, categoryId, status],
  );

  const visibleIds = useMemo(() => filtered.map((product) => product.id), [filtered]);
  const selectedIds = selectedVisibleIds(selected, visibleIds);
  const allState = selectAllState(selected, visibleIds);
  const selectedLabel =
    selectedIds.length === 1
      ? "1 producto seleccionado"
      : `${selectedIds.length} productos seleccionados`;

  const hasFilters =
    query !== "" || categoryId !== ALL_CATEGORIES || status !== "todos";

  function clearSelection() {
    setSelected(new Set());
    setBulkFailure(null);
  }

  function setRowSelected(id: string, checked: boolean) {
    setSelected((current) => toggleOne(current, id, checked));
  }

  function toggleAll() {
    setSelected((current) => toggleAllVisible(current, visibleIds));
  }

  function openBulkDelete() {
    if (selectedIds.length === 0) return;
    setDeleteIds(selectedIds);
    setDeleteOpen(true);
  }

  function handleBulkDeleted(result: DeleteProductsState) {
    const failedIds = result.failed.map((failure) => failure.id);
    setSelected(selectionAfterDelete(failedIds));

    if (failedIds.length === 0) {
      setBulkFailure(null);
      return;
    }

    const names = new Map(products.map((product) => [product.id, product.name]));
    setBulkFailure({
      deleted: result.deletedIds.length,
      failedNames: failedIds.map((id) => names.get(id) ?? "Producto no encontrado"),
    });
  }

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
    clearSelection();
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
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="-ml-1 flex min-h-10 cursor-pointer items-center gap-2 px-1 font-medium text-foreground md:hidden">
              <Checkbox
                checked={allState}
                onCheckedChange={toggleAll}
                className="size-5"
              />
              Seleccionar todos
            </label>
          )}
          <p aria-live="polite">
            {hasFilters
              ? `${filtered.length} de ${products.length} productos`
              : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
          </p>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X />
            Limpiar filtros
          </Button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {selectedIds.length > 0 ? selectedLabel : ""}
      </p>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
          <p className="text-sm font-medium">{selectedLabel}</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X />
              Limpiar selección
            </Button>
            <Button variant="destructive" size="sm" onClick={openBulkDelete}>
              <Trash2 />
              Eliminar seleccionados
            </Button>
          </div>
        </div>
      )}

      {bulkFailure && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-destructive">
              {bulkFailureTitle(bulkFailure.deleted, bulkFailure.failedNames.length)}
            </p>
            <p className="text-muted-foreground">
              {bulkFailure.failedNames.join(", ")}. Los que siguen en el listado
              quedaron seleccionados para que puedas reintentar.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Cerrar aviso"
            onClick={() => setBulkFailure(null)}
          >
            <X />
          </Button>
        </div>
      )}

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
              <li
                key={product.id}
                data-state={selected.has(product.id) ? "selected" : undefined}
                className="flex items-center gap-3 p-3 data-[state=selected]:bg-muted/50"
              >
                <label className="-my-2 -mr-1 -ml-1.5 flex size-10 shrink-0 cursor-pointer items-center justify-center">
                  <Checkbox
                    checked={selected.has(product.id)}
                    onCheckedChange={(checked) =>
                      setRowSelected(product.id, checked === true)
                    }
                    aria-label={`Seleccionar ${product.name}`}
                    className="size-5"
                  />
                </label>
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
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={allState}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos los productos visibles"
                      className="align-middle"
                    />
                  </TableHead>
                  <TableHead>Producto</TableHead>
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
                  <TableRow
                    key={product.id}
                    data-state={selected.has(product.id) ? "selected" : undefined}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selected.has(product.id)}
                        onCheckedChange={(checked) =>
                          setRowSelected(product.id, checked === true)
                        }
                        aria-label={`Seleccionar ${product.name}`}
                        className="align-middle"
                      />
                    </TableCell>
                    <TableCell>
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

      <BulkDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        productIds={deleteIds}
        onFinished={handleBulkDeleted}
      />
    </div>
  );
}
