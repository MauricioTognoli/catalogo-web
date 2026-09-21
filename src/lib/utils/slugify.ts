/**
 * Convierte un texto libre en un slug apto para URL:
 * minúsculas, sin acentos, sin caracteres especiales, palabras unidas
 * por un solo guion. Ej: "Anillos de Oro" -> "anillos-de-oro".
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-") // espacios/guiones bajos -> guion (antes de quitar especiales)
    .replace(/[^a-z0-9-]/g, "") // quita cualquier otro caracter especial
    .replace(/-+/g, "-") // colapsa guiones múltiples
    .replace(/^-+|-+$/g, ""); // recorta guiones al inicio/final
}
