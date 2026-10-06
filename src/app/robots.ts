import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

// Se genera en cada pedido: así el dominio sale de la configuración del
// entorno que corre, no del que hizo el build.
export const dynamic = "force-dynamic";

/**
 * El panel (login, admin, vista previa de borradores, plantillas) no se
 * rastrea. /admin además responde con X-Robots-Tag: noindex
 * (next.config.ts) por si algún enlace externo lo expone.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
    host: siteUrl.origin,
  };
}
