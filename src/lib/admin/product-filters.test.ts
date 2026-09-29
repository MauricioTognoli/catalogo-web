import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  filterProducts,
  parseStatusFilter,
  type FilterableProduct,
} from "./product-filters";

const products: (FilterableProduct & { id: string })[] = [
  {
    id: "1",
    name: "Anillo Solitario",
    material: "Oro 18k",
    available: true,
    categoryId: "anillos",
    categoryName: "Anillos",
    imageCount: 2,
    stockState: "ok",
  },
  {
    id: "2",
    name: "Aros Perla",
    material: "Plata 925",
    available: false,
    categoryId: "aros",
    categoryName: "Aros",
    imageCount: 0,
    stockState: "out",
  },
  {
    id: "3",
    name: "Cadena Veneciana",
    material: null,
    available: true,
    categoryId: null,
    categoryName: null,
    imageCount: 1,
    stockState: "low",
  },
];

const noFilters = {
  query: "",
  categoryId: ALL_CATEGORIES,
  status: "todos" as const,
};

function ids(result: { id: string }[]) {
  return result.map((product) => product.id);
}

describe("filterProducts", () => {
  it("devuelve todo sin filtros", () => {
    expect(ids(filterProducts(products, noFilters))).toEqual(["1", "2", "3"]);
  });

  it("busca por nombre, material y categoría, sin distinguir tildes ni mayúsculas", () => {
    expect(ids(filterProducts(products, { ...noFilters, query: "PLATA" }))).toEqual(["2"]);
    expect(ids(filterProducts(products, { ...noFilters, query: "anillos" }))).toEqual(["1"]);
    expect(ids(filterProducts(products, { ...noFilters, query: "venecíana" }))).toEqual(["3"]);
  });

  it("exige que coincidan todas las palabras", () => {
    expect(ids(filterProducts(products, { ...noFilters, query: "oro solitario" }))).toEqual(["1"]);
    expect(ids(filterProducts(products, { ...noFilters, query: "oro perla" }))).toEqual([]);
  });

  it("filtra por categoría", () => {
    expect(ids(filterProducts(products, { ...noFilters, categoryId: "aros" }))).toEqual(["2"]);
  });

  it("filtra por estado", () => {
    expect(ids(filterProducts(products, { ...noFilters, status: "visibles" }))).toEqual(["1", "3"]);
    expect(ids(filterProducts(products, { ...noFilters, status: "ocultos" }))).toEqual(["2"]);
    expect(ids(filterProducts(products, { ...noFilters, status: "sin-imagen" }))).toEqual(["2"]);
    expect(ids(filterProducts(products, { ...noFilters, status: "sin-categoria" }))).toEqual(["3"]);
  });

  it("filtra por estado de stock", () => {
    expect(ids(filterProducts(products, { ...noFilters, status: "sin-stock" }))).toEqual(["2"]);
    expect(ids(filterProducts(products, { ...noFilters, status: "stock-bajo" }))).toEqual(["3"]);
    expect(ids(filterProducts(products, { ...noFilters, status: "stock-sin-cargar" }))).toEqual([]);
  });

  it("combina filtros", () => {
    expect(
      ids(
        filterProducts(products, {
          query: "a",
          categoryId: ALL_CATEGORIES,
          status: "visibles",
        }),
      ),
    ).toEqual(["1", "3"]);
  });
});

describe("parseStatusFilter", () => {
  it("acepta valores conocidos y cae en 'todos' para el resto", () => {
    expect(parseStatusFilter("ocultos")).toBe("ocultos");
    expect(parseStatusFilter("cualquiera")).toBe("todos");
    expect(parseStatusFilter(null)).toBe("todos");
  });
});
