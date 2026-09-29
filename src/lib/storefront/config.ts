/**
 * Configuración de la portada de la tienda (tabla `storefront`).
 *
 * Se guarda como JSON en dos versiones: `draft` (lo que edita el dueño) y
 * `published` (lo que ve la tienda). Este módulo es puro (sin Supabase ni
 * DOM): normaliza lo que viene de la base, valida lo que manda el admin y
 * resuelve los destinos de los botones. Ver config.test.ts.
 */

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------

export const PAGE_TARGETS = {
  inicio: { label: "Inicio", href: "/" },
  novedades: { label: "Novedades (inicio)", href: "/#productos" },
  destacados: { label: "Destacados (inicio)", href: "/#destacados" },
} as const;

export type PageKey = keyof typeof PAGE_TARGETS;

export type LinkTarget =
  | { type: "category"; id: string }
  | { type: "product"; id: string }
  | { type: "page"; page: PageKey };

export type Cta = { label: string; target: LinkTarget | null };

export type HeroSection = {
  imagePath: string | null;
  eyebrow: string;
  /** Vacío: se muestra el nombre del negocio. */
  title: string;
  description: string;
  cta: Cta;
};

export type CollectionBlock = {
  imagePath: string | null;
  eyebrow: string;
  title: string;
  cta: Cta;
};

export type PromoSection = {
  enabled: boolean;
  imagePath: string | null;
  eyebrow: string;
  title: string;
  description: string;
  cta: Cta;
};

export type GalleryImage = { id: string; path: string; alt: string };

export type GallerySection = {
  title: string;
  subtitle: string;
  images: GalleryImage[];
};

export type StorefrontConfig = {
  version: 1;
  /** Barra de anuncios arriba de todo. Vacía: no se muestra. */
  announcement: string;
  hero: HeroSection;
  featured: { productIds: string[] };
  collections: [CollectionBlock, CollectionBlock];
  promo: PromoSection;
  gallery: GallerySection;
};

// ---------------------------------------------------------------------
// Límites
// ---------------------------------------------------------------------

export const LIMITS = {
  eyebrow: 60,
  title: 80,
  description: 240,
  ctaLabel: 30,
  announcement: 120,
  galleryTitle: 80,
  gallerySubtitle: 160,
  alt: 160,
  featuredProducts: 8,
  galleryImages: 12,
} as const;

// ---------------------------------------------------------------------
// Valores iniciales
// ---------------------------------------------------------------------

function emptyCollection(): CollectionBlock {
  return {
    imagePath: null,
    eyebrow: "",
    title: "",
    cta: { label: "Ver colección", target: null },
  };
}

/**
 * Portada inicial: sin textos promocionales de ejemplo. Nada de envíos,
 * descuentos ni beneficios que el negocio no haya cargado: la barra de
 * anuncios arranca vacía (no se muestra) y el hero muestra solo el nombre
 * del negocio y el botón a los productos. Las secciones vacías no se
 * muestran.
 */
export function defaultStorefrontConfig(): StorefrontConfig {
  return {
    version: 1,
    announcement: "",
    hero: {
      imagePath: null,
      eyebrow: "",
      title: "",
      description: "",
      cta: { label: "Ver productos", target: { type: "page", page: "novedades" } },
    },
    featured: { productIds: [] },
    collections: [emptyCollection(), emptyCollection()],
    promo: {
      enabled: false,
      imagePath: null,
      eyebrow: "",
      title: "",
      description: "",
      cta: { label: "Comprar ahora", target: null },
    },
    gallery: { title: "Galería", subtitle: "", images: [] },
  };
}

// ---------------------------------------------------------------------
// Normalización (lectura desde la base): tolerante, nunca lanza.
// ---------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && Object.hasOwn(PAGE_TARGETS, value);
}

export function normalizeLinkTarget(value: unknown): LinkTarget | null {
  if (!isRecord(value)) return null;
  if ((value.type === "category" || value.type === "product") && isUuid(value.id)) {
    return { type: value.type, id: value.id };
  }
  if (value.type === "page" && isPageKey(value.page)) {
    return { type: "page", page: value.page };
  }
  return null;
}

function normalizeCta(value: unknown, fallback: Cta): Cta {
  if (!isRecord(value)) return fallback;
  return {
    label: text(value.label, LIMITS.ctaLabel, fallback.label),
    target: normalizeLinkTarget(value.target),
  };
}

function imagePath(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** Convierte cualquier JSON (o null) en una configuración válida completa. */
export function normalizeStorefrontConfig(raw: unknown): StorefrontConfig {
  const base = defaultStorefrontConfig();
  if (!isRecord(raw)) return base;

  const hero = isRecord(raw.hero) ? raw.hero : {};
  const promo = isRecord(raw.promo) ? raw.promo : {};
  const gallery = isRecord(raw.gallery) ? raw.gallery : {};
  const featured = isRecord(raw.featured) ? raw.featured : {};
  const collections = Array.isArray(raw.collections) ? raw.collections : [];

  const normalizeCollection = (value: unknown, fallback: CollectionBlock) => {
    const block = isRecord(value) ? value : {};
    return {
      imagePath: imagePath(block.imagePath),
      eyebrow: text(block.eyebrow, LIMITS.eyebrow),
      title: text(block.title, LIMITS.title),
      cta: normalizeCta(block.cta, fallback.cta),
    };
  };

  const productIds = Array.isArray(featured.productIds)
    ? [...new Set(featured.productIds.filter(isUuid))].slice(0, LIMITS.featuredProducts)
    : [];

  const images = Array.isArray(gallery.images)
    ? gallery.images
        .filter(isRecord)
        .filter((image) => isUuid(image.id) && imagePath(image.path) !== null)
        .map((image) => ({
          id: image.id as string,
          path: image.path as string,
          alt: text(image.alt, LIMITS.alt),
        }))
        .slice(0, LIMITS.galleryImages)
    : [];

  return {
    version: 1,
    announcement: text(raw.announcement, LIMITS.announcement, base.announcement),
    hero: {
      imagePath: imagePath(hero.imagePath),
      eyebrow: text(hero.eyebrow, LIMITS.eyebrow, base.hero.eyebrow),
      title: text(hero.title, LIMITS.title),
      description: text(hero.description, LIMITS.description, base.hero.description),
      cta: normalizeCta(hero.cta, base.hero.cta),
    },
    featured: { productIds },
    collections: [
      normalizeCollection(collections[0], base.collections[0]),
      normalizeCollection(collections[1], base.collections[1]),
    ],
    promo: {
      enabled: promo.enabled === true,
      imagePath: imagePath(promo.imagePath),
      eyebrow: text(promo.eyebrow, LIMITS.eyebrow),
      title: text(promo.title, LIMITS.title),
      description: text(promo.description, LIMITS.description),
      cta: normalizeCta(promo.cta, base.promo.cta),
    },
    gallery: {
      title: text(gallery.title, LIMITS.galleryTitle, base.gallery.title),
      subtitle: text(gallery.subtitle, LIMITS.gallerySubtitle),
      images,
    },
  };
}

/** ¿El borrador difiere de lo publicado? (ambos ya normalizados) */
export function hasUnpublishedChanges(
  draft: StorefrontConfig,
  published: StorefrontConfig,
): boolean {
  return JSON.stringify(draft) !== JSON.stringify(published);
}

// ---------------------------------------------------------------------
// Validación estricta (escrituras desde el admin)
// ---------------------------------------------------------------------

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function strictText(
  value: unknown,
  max: number,
  field: string,
  { required = false } = {},
): Result<string> {
  if (value !== undefined && typeof value !== "string") {
    return { ok: false, error: `${field}: valor inválido.` };
  }
  const trimmed = (value ?? "").trim();
  if (required && trimmed === "") {
    return { ok: false, error: `${field} es obligatorio.` };
  }
  if (trimmed.length > max) {
    return { ok: false, error: `${field} no puede superar los ${max} caracteres.` };
  }
  return { ok: true, value: trimmed };
}

type ResultValues<T extends Record<string, Result<unknown>>> = {
  [K in keyof T]: T[K] extends Result<infer V> ? V : never;
};

/** Junta varios resultados: el primer error gana, si no devuelve los valores. */
function collect<T extends Record<string, Result<unknown>>>(
  fields: T,
): Result<ResultValues<T>> {
  const values: Record<string, unknown> = {};
  for (const [key, result] of Object.entries(fields)) {
    if (!result.ok) return result;
    values[key] = result.value;
  }
  return { ok: true, value: values as ResultValues<T> };
}

function strictCta(value: unknown, field: string): Result<Cta> {
  if (!isRecord(value)) return { ok: false, error: `${field}: botón inválido.` };

  const target =
    value.target === null || value.target === undefined
      ? null
      : normalizeLinkTarget(value.target);
  if (value.target != null && target === null) {
    return { ok: false, error: `${field}: el destino del botón no es válido.` };
  }

  const label = strictText(value.label, LIMITS.ctaLabel, `${field}: texto del botón`, {
    required: target !== null,
  });
  if (!label.ok) return label;

  return { ok: true, value: { label: label.value, target } };
}

/**
 * Lo que puede mandar cada editor. Nunca incluye rutas de imágenes: las
 * imágenes se suben y asignan con acciones propias, del lado del servidor.
 */
export type SectionInput =
  | {
      section: "hero";
      eyebrow: string;
      title: string;
      description: string;
      cta: Cta;
    }
  | { section: "featured"; productIds: string[] }
  | { section: "collection"; index: 0 | 1; eyebrow: string; title: string; cta: Cta }
  | {
      section: "promo";
      enabled: boolean;
      announcement: string;
      eyebrow: string;
      title: string;
      description: string;
      cta: Cta;
    }
  | {
      section: "gallery";
      title: string;
      subtitle: string;
      /** Orden y textos alternativos; mismo set de ids que el actual. */
      images: { id: string; alt: string }[];
    };

export function parseSectionInput(raw: unknown): Result<SectionInput> {
  if (!isRecord(raw)) return { ok: false, error: "Datos inválidos." };

  switch (raw.section) {
    case "hero": {
      const fields = collect({
        eyebrow: strictText(raw.eyebrow, LIMITS.eyebrow, "La bajada"),
        title: strictText(raw.title, LIMITS.title, "El título"),
        description: strictText(raw.description, LIMITS.description, "La descripción"),
        cta: strictCta(raw.cta, "Portada"),
      });
      if (!fields.ok) return fields;
      return { ok: true, value: { section: "hero", ...fields.value } };
    }

    case "featured": {
      if (!Array.isArray(raw.productIds) || !raw.productIds.every(isUuid)) {
        return { ok: false, error: "Productos inválidos." };
      }
      const productIds = [...new Set(raw.productIds as string[])];
      if (productIds.length > LIMITS.featuredProducts) {
        return {
          ok: false,
          error: `Podés destacar hasta ${LIMITS.featuredProducts} productos.`,
        };
      }
      return { ok: true, value: { section: "featured", productIds } };
    }

    case "collection": {
      if (raw.index !== 0 && raw.index !== 1) {
        return { ok: false, error: "Colección inválida." };
      }
      const fields = collect({
        eyebrow: strictText(raw.eyebrow, LIMITS.eyebrow, "La bajada"),
        title: strictText(raw.title, LIMITS.title, "El título"),
        cta: strictCta(raw.cta, "Colección"),
      });
      if (!fields.ok) return fields;
      return {
        ok: true,
        value: { section: "collection", index: raw.index, ...fields.value },
      };
    }

    case "promo": {
      if (typeof raw.enabled !== "boolean") {
        return { ok: false, error: "Estado de la promoción inválido." };
      }
      const fields = collect({
        announcement: strictText(
          raw.announcement,
          LIMITS.announcement,
          "La barra de anuncios",
        ),
        eyebrow: strictText(raw.eyebrow, LIMITS.eyebrow, "La bajada"),
        // Activa necesita un título; desactivada se puede dejar a medias.
        title: strictText(raw.title, LIMITS.title, "El título", {
          required: raw.enabled,
        }),
        description: strictText(raw.description, LIMITS.description, "La descripción"),
        cta: strictCta(raw.cta, "Promoción"),
      });
      if (!fields.ok) return fields;
      return {
        ok: true,
        value: { section: "promo", enabled: raw.enabled, ...fields.value },
      };
    }

    case "gallery": {
      const title = strictText(raw.title, LIMITS.galleryTitle, "El título");
      const subtitle = strictText(raw.subtitle, LIMITS.gallerySubtitle, "El subtítulo");
      if (!title.ok) return title;
      if (!subtitle.ok) return subtitle;
      if (!Array.isArray(raw.images)) return { ok: false, error: "Imágenes inválidas." };

      const images: { id: string; alt: string }[] = [];
      for (const image of raw.images) {
        if (!isRecord(image) || !isUuid(image.id)) {
          return { ok: false, error: "Imágenes inválidas." };
        }
        const alt = strictText(image.alt, LIMITS.alt, "El texto alternativo", {
          required: true,
        });
        if (!alt.ok) return alt;
        images.push({ id: image.id, alt: alt.value });
      }
      return {
        ok: true,
        value: { section: "gallery", title: title.value, subtitle: subtitle.value, images },
      };
    }

    default:
      return { ok: false, error: "Sección desconocida." };
  }
}

/** Ids de categorías y productos que una sección referencia (para validar pertenencia). */
export function referencedIds(input: SectionInput): {
  categoryIds: string[];
  productIds: string[];
} {
  const categoryIds: string[] = [];
  const productIds: string[] = [];
  const addTarget = (cta: Cta) => {
    if (cta.target?.type === "category") categoryIds.push(cta.target.id);
    if (cta.target?.type === "product") productIds.push(cta.target.id);
  };

  if (input.section === "featured") productIds.push(...input.productIds);
  if ("cta" in input) addTarget(input.cta);

  return { categoryIds, productIds };
}

/**
 * Aplica una sección validada al borrador. Las imágenes existentes se
 * conservan (los editores no las mandan). En la galería, el set de ids
 * tiene que coincidir con el actual: quitar una imagen es otra acción.
 */
export function applySectionInput(
  config: StorefrontConfig,
  input: SectionInput,
): Result<StorefrontConfig> {
  switch (input.section) {
    case "hero":
      return {
        ok: true,
        value: {
          ...config,
          hero: {
            ...config.hero,
            eyebrow: input.eyebrow,
            title: input.title,
            description: input.description,
            cta: input.cta,
          },
        },
      };

    case "featured":
      return { ok: true, value: { ...config, featured: { productIds: input.productIds } } };

    case "collection": {
      const collections: [CollectionBlock, CollectionBlock] = [...config.collections];
      collections[input.index] = {
        ...collections[input.index],
        eyebrow: input.eyebrow,
        title: input.title,
        cta: input.cta,
      };
      return { ok: true, value: { ...config, collections } };
    }

    case "promo":
      return {
        ok: true,
        value: {
          ...config,
          announcement: input.announcement,
          promo: {
            ...config.promo,
            enabled: input.enabled,
            eyebrow: input.eyebrow,
            title: input.title,
            description: input.description,
            cta: input.cta,
          },
        },
      };

    case "gallery": {
      const byId = new Map(config.gallery.images.map((image) => [image.id, image]));
      const sameSet =
        input.images.length === byId.size &&
        new Set(input.images.map((image) => image.id)).size === byId.size &&
        input.images.every((image) => byId.has(image.id));
      if (!sameSet) {
        return {
          ok: false,
          error: "La galería cambió mientras editabas. Recargá la página.",
        };
      }
      return {
        ok: true,
        value: {
          ...config,
          gallery: {
            title: input.title,
            subtitle: input.subtitle,
            images: input.images.map((image) => ({
              ...byId.get(image.id)!,
              alt: image.alt,
            })),
          },
        },
      };
    }
  }
}

// ---------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------

export type ImageSlot = "hero" | "promo" | "collection-0" | "collection-1" | "gallery";

export function isImageSlot(value: unknown): value is ImageSlot {
  return (
    value === "hero" ||
    value === "promo" ||
    value === "collection-0" ||
    value === "collection-1" ||
    value === "gallery"
  );
}

/** Carpeta de la portada dentro del bucket business-assets. */
export function storefrontFolder(businessId: string): string {
  return `${businessId}/storefront/`;
}

/**
 * Un path solo es aceptable si está dentro de la carpeta del negocio.
 * Defensa en profundidad: la policy de Storage ya lo exige para subir y
 * borrar, pero esto evita referenciar (y mostrar) archivos ajenos.
 */
export function isOwnedImagePath(path: string, businessId: string): boolean {
  const folder = storefrontFolder(businessId);
  return (
    path.startsWith(folder) &&
    !path.includes("..") &&
    /^[0-9a-f-]+\.(jpg|png|webp)$/i.test(path.slice(folder.length))
  );
}

type SingleSlot = Exclude<ImageSlot, "gallery">;

function slotPath(config: StorefrontConfig, slot: SingleSlot): string | null {
  if (slot === "hero") return config.hero.imagePath;
  if (slot === "promo") return config.promo.imagePath;
  return config.collections[slot === "collection-0" ? 0 : 1].imagePath;
}

function withSlotPath(
  config: StorefrontConfig,
  slot: SingleSlot,
  imagePath: string | null,
): StorefrontConfig {
  if (slot === "hero") return { ...config, hero: { ...config.hero, imagePath } };
  if (slot === "promo") return { ...config, promo: { ...config.promo, imagePath } };

  const index = slot === "collection-0" ? 0 : 1;
  const collections: [CollectionBlock, CollectionBlock] = [...config.collections];
  collections[index] = { ...collections[index], imagePath };
  return { ...config, collections };
}

/** Asigna una imagen nueva a un lugar del borrador. Devuelve la reemplazada. */
export function setSlotImage(
  config: StorefrontConfig,
  slot: ImageSlot,
  path: string,
  options: { id?: string; alt?: string } = {},
): Result<{ config: StorefrontConfig; replaced: string | null }> {
  if (slot !== "gallery") {
    return {
      ok: true,
      value: {
        config: withSlotPath(config, slot, path),
        replaced: slotPath(config, slot),
      },
    };
  }

  if (config.gallery.images.length >= LIMITS.galleryImages) {
    return {
      ok: false,
      error: `La galería admite hasta ${LIMITS.galleryImages} imágenes.`,
    };
  }
  if (!options.id || !isUuid(options.id)) {
    return { ok: false, error: "Imagen inválida." };
  }
  const alt = (options.alt ?? "").trim();
  if (alt === "" || alt.length > LIMITS.alt) {
    return {
      ok: false,
      error: `El texto alternativo es obligatorio (hasta ${LIMITS.alt} caracteres).`,
    };
  }

  return {
    ok: true,
    value: {
      config: {
        ...config,
        gallery: {
          ...config.gallery,
          images: [...config.gallery.images, { id: options.id, path, alt }],
        },
      },
      replaced: null,
    },
  };
}

/** Quita la imagen de un lugar. `imageId` es obligatorio para la galería. */
export function clearSlotImage(
  config: StorefrontConfig,
  slot: ImageSlot,
  imageId?: string,
): Result<{ config: StorefrontConfig; removed: string | null }> {
  if (slot !== "gallery") {
    return {
      ok: true,
      value: {
        config: withSlotPath(config, slot, null),
        removed: slotPath(config, slot),
      },
    };
  }

  const target = config.gallery.images.find((image) => image.id === imageId);
  if (!target) return { ok: false, error: "La imagen ya no está en la galería." };

  return {
    ok: true,
    value: {
      config: {
        ...config,
        gallery: {
          ...config.gallery,
          images: config.gallery.images.filter((image) => image.id !== imageId),
        },
      },
      removed: target.path,
    },
  };
}

export function imagePathsOf(config: StorefrontConfig): Set<string> {
  const paths = [
    config.hero.imagePath,
    config.promo.imagePath,
    config.collections[0].imagePath,
    config.collections[1].imagePath,
    ...config.gallery.images.map((image) => image.path),
  ];
  return new Set(paths.filter((path): path is string => path !== null));
}

/**
 * Archivos que se pueden borrar de Storage: estaban en `before` y ya no
 * los usa ninguna de las versiones vigentes (borrador y publicado). Un
 * archivo publicado nunca se borra por editar el borrador.
 */
export function unreferencedImagePaths(
  before: StorefrontConfig | string[],
  current: StorefrontConfig[],
): string[] {
  const candidates = Array.isArray(before) ? before : [...imagePathsOf(before)];
  const inUse = new Set(current.flatMap((config) => [...imagePathsOf(config)]));
  return [...new Set(candidates)].filter((path) => !inUse.has(path));
}

// ---------------------------------------------------------------------
// Resolución de destinos (render de la tienda)
// ---------------------------------------------------------------------

export type LinkContext = {
  /** Categorías del negocio: id -> slug. */
  categories: Map<string, string>;
  /** Productos VISIBLES del negocio: id -> slug. */
  products: Map<string, string>;
  /** ¿La sección Destacados se muestra? (tiene productos visibles) */
  hasFeatured: boolean;
};

/**
 * Devuelve el href del destino, o null si no lleva a ningún lugar válido
 * (categoría borrada, producto oculto/eliminado, sección vacía). La
 * tienda no dibuja botones con destino null.
 */
export function resolveLinkTarget(
  target: LinkTarget | null,
  context: LinkContext,
): string | null {
  if (!target) return null;

  switch (target.type) {
    case "category": {
      const slug = context.categories.get(target.id);
      return slug ? `/categorias/${slug}` : null;
    }
    case "product": {
      const slug = context.products.get(target.id);
      return slug ? `/productos/${slug}` : null;
    }
    case "page":
      if (target.page === "destacados" && !context.hasFeatured) return null;
      return PAGE_TARGETS[target.page].href;
  }
}

// ---------------------------------------------------------------------
// Qué se muestra (tienda) y por qué no (avisos del editor)
// ---------------------------------------------------------------------

/** Motivo por el que un bloque no se muestra, o null si se muestra. */
export function collectionHiddenReason(block: CollectionBlock): string | null {
  if (block.title === "") return "Falta el título.";
  if (block.imagePath === null) return "Falta la imagen.";
  return null;
}

export function promoHiddenReason(promo: PromoSection): string | null {
  if (!promo.enabled) return "Está desactivada.";
  if (promo.title === "") return "Falta el título.";
  return null;
}

export function galleryHiddenReason(gallery: { images: unknown[] }): string | null {
  return gallery.images.length === 0 ? "No tiene imágenes." : null;
}

/** Destacados en el orden elegido, salteando los que ya no son visibles. */
export function visibleFeatured<T extends { id: string }>(
  productIds: string[],
  visibleProducts: T[],
): T[] {
  const byId = new Map(visibleProducts.map((product) => [product.id, product]));
  return productIds
    .map((id) => byId.get(id))
    .filter((product): product is T => product !== undefined);
}

export function resolveCta(
  cta: Cta,
  context: LinkContext,
): { label: string; href: string } | null {
  const href = resolveLinkTarget(cta.target, context);
  if (!href || cta.label === "") return null;
  return { label: cta.label, href };
}
