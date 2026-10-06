import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  NO_ZOOM,
  clampIndex,
  clampOffset,
  clampZoom,
  distance,
  indexFromScroll,
  isZoomed,
  withScale,
} from "./gallery-math";

const frame = { width: 400, height: 300 };

describe("clampIndex", () => {
  it("se mantiene dentro de las imágenes disponibles", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe("indexFromScroll", () => {
  it("toma la imagen más visible", () => {
    expect(indexFromScroll(0, 360, 4)).toBe(0);
    expect(indexFromScroll(170, 360, 4)).toBe(0);
    expect(indexFromScroll(190, 360, 4)).toBe(1);
    expect(indexFromScroll(1080, 360, 4)).toBe(3);
  });

  it("tolera rebotes y anchos inválidos", () => {
    expect(indexFromScroll(-40, 360, 4)).toBe(0);
    expect(indexFromScroll(5000, 360, 4)).toBe(3);
    expect(indexFromScroll(100, 0, 4)).toBe(0);
  });
});

describe("zoom", () => {
  it("limita la escala entre 1 y el máximo", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("mide la distancia entre dos dedos", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("no deja arrastrar la imagen fuera del recuadro", () => {
    expect(clampOffset({ x: 500, y: -500 }, 2, frame)).toEqual({ x: 200, y: -150 });
    expect(clampOffset({ x: 50, y: 20 }, 1, frame)).toEqual({ x: 0, y: 0 });
  });

  it("al volver a escala 1 resetea el desplazamiento", () => {
    const zoomed = { scale: 3, offset: { x: 100, y: 50 } };
    expect(withScale(zoomed, 0.8, frame)).toEqual(NO_ZOOM);
    expect(isZoomed(withScale(zoomed, 0.8, frame))).toBe(false);
  });

  it("al alejar ajusta el desplazamiento a los nuevos límites", () => {
    const zoomed = { scale: 4, offset: { x: 600, y: 0 } };
    expect(withScale(zoomed, 2, frame)).toEqual({ scale: 2, offset: { x: 200, y: 0 } });
  });
});
