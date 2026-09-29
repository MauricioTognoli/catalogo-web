import type { Metadata } from "next";

export const DESCRIPTION_MAX_LENGTH = 160;

/**
 * Texto apto para meta description: una sola línea, sin espacios de más,
 * cortado en una palabra y con "…" si hace falta.
 */
export function toDescription(
  text: string | null | undefined,
  max: number = DESCRIPTION_MAX_LENGTH,
): string | null {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean === "") return null;
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–-]+$/, "")}…`;
}

/** Primera opción no vacía (para cadenas de imágenes/descripciones). */
export function firstPresent<T>(...values: (T | null | undefined)[]): T | null {
  return values.find((value): value is T => value !== null && value !== undefined) ?? null;
}

export type ShareImage = {
  url: string;
  alt: string;
  /** false para el logo (cuadrado): tarjeta chica en vez de la grande. */
  large?: boolean;
};

/** Logo del negocio como último recurso para compartir. */
export function logoShareImage(business: {
  name: string;
  logo_url: string | null;
}): ShareImage | null {
  return business.logo_url
    ? { url: business.logo_url, alt: `Logo de ${business.name}`, large: false }
    : null;
}

/**
 * Metadata de una página pública: título, descripción, canónica y
 * Open Graph/Twitter coherentes. Sin imagen no se inventa una: se usa la
 * tarjeta "summary" sin og:image.
 */
export function pageMetadata({
  title,
  description,
  path,
  siteName,
  image,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  /** Ruta relativa a metadataBase, ej: "/productos/anillo". */
  path: string;
  siteName: string;
  image: ShareImage | null;
  /** true: el título no pasa por la plantilla "%s · Negocio". */
  absoluteTitle?: boolean;
}): Metadata {
  const socialTitle = absoluteTitle ? title : `${title} · ${siteName}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName,
      url: path,
      title: socialTitle,
      description,
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
    twitter: {
      card: image && image.large !== false ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}
