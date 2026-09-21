/**
 * Formatea un valor numérico como moneda para mostrarlo en la UI.
 * El almacenamiento en base de datos es siempre un número plano
 * (sin símbolo de moneda); esta función solo afecta la presentación.
 * Por ahora el negocio opera en Argentina, por eso el default es ARS,
 * pero la moneda es un parámetro, no un valor fijo en la lógica.
 */
export function formatPrice(value: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}
