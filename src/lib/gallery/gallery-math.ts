export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.5;
export const DOUBLE_TAP_ZOOM = 2.5;

export type Point = { x: number; y: number };
export type ZoomState = { scale: number; offset: Point };

export const NO_ZOOM: ZoomState = { scale: MIN_ZOOM, offset: { x: 0, y: 0 } };

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function indexFromScroll(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0) return 0;
  return clampIndex(Math.round(scrollLeft / slideWidth), count);
}

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM;
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clampOffset(
  offset: Point,
  scale: number,
  frame: { width: number; height: number },
): Point {
  const maxX = Math.max(0, (frame.width * (scale - 1)) / 2);
  const maxY = Math.max(0, (frame.height * (scale - 1)) / 2);
  return {
    x: Math.min(Math.max(offset.x, -maxX), maxX),
    y: Math.min(Math.max(offset.y, -maxY), maxY),
  };
}

export function withScale(
  zoom: ZoomState,
  scale: number,
  frame: { width: number; height: number },
): ZoomState {
  const next = clampZoom(scale);
  if (next === MIN_ZOOM) return NO_ZOOM;
  return { scale: next, offset: clampOffset(zoom.offset, next, frame) };
}

export function isZoomed(zoom: ZoomState): boolean {
  return zoom.scale > MIN_ZOOM;
}

export function preferredScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
