import { describe, expect, it } from "vitest";
import {
  selectAllState,
  selectedVisibleIds,
  selectionAfterDelete,
  toggleAllVisible,
  toggleOne,
} from "./product-selection";

const visible = ["a", "b", "c"];

describe("selectAllState", () => {
  it("sin selección no está tildada", () => {
    expect(selectAllState(new Set(), visible)).toBe(false);
  });

  it("con algunos seleccionados queda indeterminada", () => {
    expect(selectAllState(new Set(["a"]), visible)).toBe("indeterminate");
  });

  it("con todos los visibles seleccionados queda tildada", () => {
    expect(selectAllState(new Set(visible), visible)).toBe(true);
  });

  it("ignora seleccionados que ya no están visibles", () => {
    expect(selectAllState(new Set(["x"]), visible)).toBe(false);
    expect(selectAllState(new Set(["a", "b", "c", "x"]), visible)).toBe(true);
  });

  it("sin productos visibles no está tildada", () => {
    expect(selectAllState(new Set(["a"]), [])).toBe(false);
  });
});

describe("toggleAllVisible", () => {
  it("selecciona todos los visibles cuando no hay selección", () => {
    expect([...toggleAllVisible(new Set(), visible)]).toEqual(visible);
  });

  it("completa la selección cuando está indeterminada", () => {
    expect([...toggleAllVisible(new Set(["b"]), visible)].sort()).toEqual(visible);
  });

  it("deselecciona todo cuando ya estaban todos", () => {
    expect(toggleAllVisible(new Set(visible), visible).size).toBe(0);
  });

  it("nunca incluye productos ocultos por los filtros", () => {
    const next = toggleAllVisible(new Set(["oculto"]), visible);
    expect(next.has("oculto")).toBe(false);
  });
});

describe("toggleOne", () => {
  it("agrega y quita sin mutar el set original", () => {
    const original = new Set(["a"]);
    const added = toggleOne(original, "b", true);
    const removed = toggleOne(added, "a", false);
    expect([...original]).toEqual(["a"]);
    expect([...added].sort()).toEqual(["a", "b"]);
    expect([...removed]).toEqual(["b"]);
  });
});

describe("selectedVisibleIds", () => {
  it("devuelve solo los seleccionados visibles, en el orden del listado", () => {
    expect(selectedVisibleIds(new Set(["c", "x", "a"]), visible)).toEqual(["a", "c"]);
  });
});

describe("selectionAfterDelete", () => {
  it("conserva únicamente los que fallaron", () => {
    expect([...selectionAfterDelete(["b"])]).toEqual(["b"]);
    expect(selectionAfterDelete([]).size).toBe(0);
  });
});
