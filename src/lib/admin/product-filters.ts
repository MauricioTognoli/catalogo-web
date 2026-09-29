import type { StockState } from "@/lib/stock/availability";

export const PRODUCT_STATUS_FILTERS = [
  { value: "todos", label: "Todos los estados" },
  { value: "visibles", label: "Visibles en tienda" },
  { value: "ocultos", label: "Ocultos" },
  { value: "sin-imagen", label: "Sin imagen" },
  { value: "sin-categoria", label: "Sin categoría" },
  { value: "sin-stock", label: "Sin stock" },
  { value: "stock-bajo", label: "Stock bajo" },
  { value: "stock-sin-cargar", label: "Stock sin cargar" },
] as const;

export type ProductStatusFilter =
  (typeof PRODUCT_STATUS_FILTERS)[number]["value"];

export const ALL_CATEGORIES = "todas";

export type FilterableProduct = {
  name: string;
  material: string | null;
  available: boolean;
  categoryId: string | null;
  categoryName: string | null;
  imageCount: number;
  stockState: StockState;
};

export type ProductFilters = {
  query: string;
  categoryId: string;
  status: ProductStatusFilter;
};

export function parseStatusFilter(
  value: string | null | undefined,
): ProductStatusFilter {
  return PRODUCT_STATUS_FILTERS.some((filter) => filter.value === value)
    ? (value as ProductStatusFilter)
    : "todos";
}

/** Minúsculas y sin tildes: "medalla" encuentra "Medalla" y "Medálla". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function matchesStatus(
  product: FilterableProduct,
  status: ProductStatusFilter,
): boolean {
  switch (status) {
    case "visibles":
      return product.available;
    case "ocultos":
      return !product.available;
    case "sin-imagen":
      return product.imageCount === 0;
    case "sin-categoria":
      return product.categoryId === null;
    case "sin-stock":
      return product.stockState === "out";
    case "stock-bajo":
      return product.stockState === "low";
    case "stock-sin-cargar":
      return product.stockState === "untracked";
    case "todos":
      return true;
  }
}

export function filterProducts<T extends FilterableProduct>(
  products: T[],
  { query, categoryId, status }: ProductFilters,
): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    if (categoryId !== ALL_CATEGORIES && product.categoryId !== categoryId) {
      return false;
    }

    if (!matchesStatus(product, status)) {
      return false;
    }

    if (terms.length === 0) {
      return true;
    }

    const haystack = normalize(
      [product.name, product.material, product.categoryName]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
