/**
 * Un whatsapp_number "usable": no vacío ni solo espacios. No repite la
 * validación de formato (solo dígitos, longitud) que ya hace el panel
 * admin al guardar el negocio (src/actions/business.ts) — ver la
 * decisión documentada en el resumen de esta etapa.
 */
export function hasWhatsAppNumber(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Arma la URL de wa.me. No agrega, quita ni reformatea el número: se usa
 * tal cual está almacenado en business.whatsapp_number.
 */
export function buildWhatsAppUrl(
  whatsappNumber: string,
  message: string,
): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
