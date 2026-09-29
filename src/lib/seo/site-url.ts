/**
 * URL pública de la tienda, base de canónicas, Open Graph y sitemap.
 *
 * En producción se configura NEXT_PUBLIC_SITE_URL con el dominio real
 * (ej: https://joyeria.com.ar). Si falta, se usa el dominio de producción
 * de Vercel y, en desarrollo, localhost.
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): URL {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const url = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`);
      // Solo el origen: nada de rutas, query ni barra final.
      return new URL(url.origin);
    } catch {
      // Valor mal formado: se prueba el siguiente.
    }
  }

  return new URL("http://localhost:3000");
}
