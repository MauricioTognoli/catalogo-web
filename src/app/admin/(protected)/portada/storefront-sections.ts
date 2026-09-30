export const STOREFRONT_SECTIONS = [
  { value: "principal", label: "Principal" },
  { value: "destacados", label: "Destacados" },
  { value: "colecciones", label: "Colecciones" },
  { value: "promocion", label: "Promoción" },
  { value: "galeria", label: "Galería" },
] as const;

export type StorefrontSectionKey = (typeof STOREFRONT_SECTIONS)[number]["value"];
