import { cache } from "react";

/**
 * "Ahora" del servidor, fijo durante todo el request. Precios, banner y
 * contador usan el mismo instante: una oferta no puede verse vigente en
 * el banner y vencida en la grilla de la misma página.
 */
export const getRequestNow = cache((): number => Date.now());
