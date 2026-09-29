import { describe, expect, it } from "vitest";
import {
  LIMITS,
  applySectionInput,
  clearSlotImage,
  collectionHiddenReason,
  galleryHiddenReason,
  promoHiddenReason,
  visibleFeatured,
  defaultStorefrontConfig,
  hasUnpublishedChanges,
  imagePathsOf,
  isOwnedImagePath,
  normalizeStorefrontConfig,
  parseSectionInput,
  referencedIds,
  resolveCta,
  resolveLinkTarget,
  setSlotImage,
  unreferencedImagePaths,
  type LinkContext,
  type StorefrontConfig,
} from "./config";

const BUSINESS = "11111111-1111-4111-8111-111111111111";
const OTHER_BUSINESS = "22222222-2222-4222-8222-222222222222";
const CATEGORY = "33333333-3333-4333-8333-333333333333";
const PRODUCT = "44444444-4444-4444-8444-444444444444";
const HIDDEN_PRODUCT = "55555555-5555-4555-8555-555555555555";
const IMAGE_ID = "66666666-6666-4666-8666-666666666666";

const path = (name: string, business = BUSINESS) =>
  `${business}/storefront/${name}.webp`;

const context: LinkContext = {
  categories: new Map([[CATEGORY, "anillos"]]),
  products: new Map([[PRODUCT, "anillo-solitario"]]),
  hasFeatured: true,
};

describe("valores iniciales y normalización", () => {
  it("una tienda sin configuración no muestra textos promocionales de ejemplo", () => {
    const config = normalizeStorefrontConfig(null);
    expect(config).toEqual(defaultStorefrontConfig());
    // Nada de envíos, descuentos ni beneficios que el negocio no cargó.
    expect(config.announcement).toBe("");
    expect(config.hero.eyebrow).toBe("");
    expect(config.hero.description).toBe("");
    // Título vacío: la tienda muestra el nombre del negocio.
    expect(config.hero.title).toBe("");
    expect(config.hero.cta.target).toEqual({ type: "page", page: "novedades" });
  });

  it("lo que el dueño sí configuró se conserva", () => {
    const config = normalizeStorefrontConfig({
      announcement: "Envío gratis en CABA",
      hero: { eyebrow: "Nueva colección", description: "Hecho a mano." },
    });
    expect(config.announcement).toBe("Envío gratis en CABA");
    expect(config.hero.eyebrow).toBe("Nueva colección");
    expect(config.hero.description).toBe("Hecho a mano.");
  });

  it("las secciones nuevas arrancan vacías o desactivadas", () => {
    const config = defaultStorefrontConfig();
    expect(config.featured.productIds).toEqual([]);
    expect(config.collections.every((block) => block.title === "")).toBe(true);
    expect(config.promo.enabled).toBe(false);
    expect(config.gallery.images).toEqual([]);
  });

  it("descarta datos corruptos sin lanzar", () => {
    const config = normalizeStorefrontConfig({
      hero: { title: 42, cta: { label: "Ir", target: { type: "category", id: "no-uuid" } } },
      featured: { productIds: [PRODUCT, PRODUCT, "x"] },
      gallery: { images: [{ id: IMAGE_ID, path: path("a"), alt: "Aros" }, { id: 1 }] },
      collections: "nope",
    });
    expect(config.hero.title).toBe("");
    expect(config.hero.cta.target).toBeNull();
    expect(config.featured.productIds).toEqual([PRODUCT]);
    expect(config.gallery.images).toHaveLength(1);
    expect(config.collections).toHaveLength(2);
  });

  it("detecta cambios sin publicar", () => {
    const published = defaultStorefrontConfig();
    const draft = { ...published, announcement: "Hot Sale" };
    expect(hasUnpublishedChanges(published, defaultStorefrontConfig())).toBe(false);
    expect(hasUnpublishedChanges(draft, published)).toBe(true);
  });
});

describe("destinos de los botones", () => {
  it("resuelve categorías, productos visibles y páginas", () => {
    expect(resolveLinkTarget({ type: "category", id: CATEGORY }, context)).toBe(
      "/categorias/anillos",
    );
    expect(resolveLinkTarget({ type: "product", id: PRODUCT }, context)).toBe(
      "/productos/anillo-solitario",
    );
    expect(resolveLinkTarget({ type: "page", page: "novedades" }, context)).toBe(
      "/#productos",
    );
  });

  it("no genera enlaces a destinos que no existen o no se ven", () => {
    expect(resolveLinkTarget(null, context)).toBeNull();
    expect(resolveLinkTarget({ type: "category", id: PRODUCT }, context)).toBeNull();
    // Producto oculto o eliminado: no está entre los visibles.
    expect(resolveLinkTarget({ type: "product", id: HIDDEN_PRODUCT }, context)).toBeNull();
    expect(
      resolveLinkTarget(
        { type: "page", page: "destacados" },
        { ...context, hasFeatured: false },
      ),
    ).toBeNull();
  });

  it("un botón sin destino válido o sin texto no se dibuja", () => {
    expect(resolveCta({ label: "Ver", target: null }, context)).toBeNull();
    expect(
      resolveCta({ label: "", target: { type: "page", page: "inicio" } }, context),
    ).toBeNull();
    expect(
      resolveCta({ label: "Ver", target: { type: "page", page: "inicio" } }, context),
    ).toEqual({ label: "Ver", href: "/" });
  });
});

describe("secciones visibles", () => {
  it("un bloque de colección necesita título e imagen", () => {
    const block = defaultStorefrontConfig().collections[0];
    expect(collectionHiddenReason(block)).toBe("Falta el título.");
    expect(collectionHiddenReason({ ...block, title: "Birthday" })).toBe("Falta la imagen.");
    expect(
      collectionHiddenReason({ ...block, title: "Birthday", imagePath: path("c") }),
    ).toBeNull();
  });

  it("la promoción se muestra solo activa y con título", () => {
    const promo = defaultStorefrontConfig().promo;
    expect(promoHiddenReason(promo)).toBe("Está desactivada.");
    expect(promoHiddenReason({ ...promo, enabled: true })).toBe("Falta el título.");
    expect(promoHiddenReason({ ...promo, enabled: true, title: "18k Gold" })).toBeNull();
  });

  it("la galería vacía no se muestra", () => {
    expect(galleryHiddenReason(defaultStorefrontConfig().gallery)).not.toBeNull();
  });

  it("los destacados respetan el orden y omiten productos ocultos o eliminados", () => {
    const visible = [{ id: "b" }, { id: "a" }];
    expect(visibleFeatured(["a", "x", "b"], visible)).toEqual([{ id: "a" }, { id: "b" }]);
  });
});

describe("validación de lo que envían los editores", () => {
  it("exige texto de botón cuando hay destino", () => {
    const result = parseSectionInput({
      section: "hero",
      eyebrow: "",
      title: "",
      description: "",
      cta: { label: " ", target: { type: "page", page: "inicio" } },
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza destinos mal formados en lugar de ignorarlos", () => {
    const result = parseSectionInput({
      section: "collection",
      index: 0,
      eyebrow: "",
      title: "Birthday",
      cta: { label: "Ver", target: { type: "page", page: "blog" } },
    });
    expect(result.ok).toBe(false);
  });

  it("respeta los límites de longitud", () => {
    const result = parseSectionInput({
      section: "hero",
      eyebrow: "",
      title: "x".repeat(LIMITS.title + 1),
      description: "",
      cta: { label: "", target: null },
    });
    expect(result.ok).toBe(false);
  });

  it("la promoción activa necesita título", () => {
    const base = {
      section: "promo",
      announcement: "",
      eyebrow: "",
      title: "",
      description: "",
      cta: { label: "", target: null },
    };
    expect(parseSectionInput({ ...base, enabled: true }).ok).toBe(false);
    expect(parseSectionInput({ ...base, enabled: false }).ok).toBe(true);
  });

  it("limita la cantidad de destacados y quita duplicados", () => {
    const ids = Array.from({ length: LIMITS.featuredProducts + 1 }, (_, i) =>
      `44444444-4444-4444-8444-${String(i).padStart(12, "0")}`,
    );
    expect(parseSectionInput({ section: "featured", productIds: ids }).ok).toBe(false);

    const result = parseSectionInput({ section: "featured", productIds: [PRODUCT, PRODUCT] });
    expect(result.ok && result.value.section === "featured" && result.value.productIds).toEqual([
      PRODUCT,
    ]);
  });

  it("la galería exige texto alternativo", () => {
    const result = parseSectionInput({
      section: "gallery",
      title: "Galería",
      subtitle: "",
      images: [{ id: IMAGE_ID, alt: "  " }],
    });
    expect(result.ok).toBe(false);
  });

  it("informa qué categorías y productos hay que verificar como propios", () => {
    const featured = parseSectionInput({ section: "featured", productIds: [PRODUCT] });
    const collection = parseSectionInput({
      section: "collection",
      index: 1,
      eyebrow: "",
      title: "Anillos",
      cta: { label: "Ver", target: { type: "category", id: CATEGORY } },
    });
    if (!featured.ok || !collection.ok) throw new Error("inválido");
    expect(referencedIds(featured.value)).toEqual({ categoryIds: [], productIds: [PRODUCT] });
    expect(referencedIds(collection.value)).toEqual({
      categoryIds: [CATEGORY],
      productIds: [],
    });
  });
});

describe("aplicar cambios al borrador", () => {
  it("los editores de texto no pueden tocar imágenes", () => {
    const config: StorefrontConfig = {
      ...defaultStorefrontConfig(),
      hero: { ...defaultStorefrontConfig().hero, imagePath: path("hero") },
    };
    const input = parseSectionInput({
      section: "hero",
      eyebrow: "New arrivals",
      title: "Milancélos",
      description: "",
      cta: { label: "", target: null },
      imagePath: path("otra", OTHER_BUSINESS),
    });
    if (!input.ok) throw new Error(input.error);
    const result = applySectionInput(config, input.value);
    expect(result.ok && result.value.hero).toMatchObject({
      imagePath: path("hero"),
      title: "Milancélos",
    });
  });

  it("reordenar la galería exige el mismo conjunto de imágenes", () => {
    const second = "77777777-7777-4777-8777-777777777777";
    const config: StorefrontConfig = {
      ...defaultStorefrontConfig(),
      gallery: {
        title: "Galería",
        subtitle: "",
        images: [
          { id: IMAGE_ID, path: path("a"), alt: "A" },
          { id: second, path: path("b"), alt: "B" },
        ],
      },
    };

    const reordered = applySectionInput(config, {
      section: "gallery",
      title: "Galería",
      subtitle: "",
      images: [
        { id: second, alt: "B nueva" },
        { id: IMAGE_ID, alt: "A" },
      ],
    });
    expect(reordered.ok && reordered.value.gallery.images.map((image) => image.path)).toEqual([
      path("b"),
      path("a"),
    ]);

    const missing = applySectionInput(config, {
      section: "gallery",
      title: "Galería",
      subtitle: "",
      images: [{ id: IMAGE_ID, alt: "A" }],
    });
    expect(missing.ok).toBe(false);
  });
});

describe("imágenes", () => {
  it("solo acepta paths dentro de la carpeta del propio negocio", () => {
    expect(isOwnedImagePath(path("abc-123"), BUSINESS)).toBe(true);
    expect(isOwnedImagePath(path("abc-123", OTHER_BUSINESS), BUSINESS)).toBe(false);
    expect(isOwnedImagePath(`${BUSINESS}/storefront/../logo/x.webp`, BUSINESS)).toBe(false);
    expect(isOwnedImagePath(`${BUSINESS}/logo/abc.webp`, BUSINESS)).toBe(false);
    expect(isOwnedImagePath(`${BUSINESS}/storefront/abc.svg`, BUSINESS)).toBe(false);
  });

  it("reemplazar informa la imagen anterior; quitar deja el lugar vacío", () => {
    const config = defaultStorefrontConfig();
    const first = setSlotImage(config, "collection-1", path("uno"));
    if (!first.ok) throw new Error(first.error);
    expect(first.value.replaced).toBeNull();

    const second = setSlotImage(first.value.config, "collection-1", path("dos"));
    if (!second.ok) throw new Error(second.error);
    expect(second.value.replaced).toBe(path("uno"));
    expect(second.value.config.collections[0].imagePath).toBeNull();

    const cleared = clearSlotImage(second.value.config, "collection-1");
    if (!cleared.ok) throw new Error(cleared.error);
    expect(cleared.value.removed).toBe(path("dos"));
    expect(cleared.value.config.collections[1].imagePath).toBeNull();
  });

  it("la galería exige alt y respeta el máximo", () => {
    const config = defaultStorefrontConfig();
    expect(setSlotImage(config, "gallery", path("g"), { id: IMAGE_ID, alt: "" }).ok).toBe(false);

    const full: StorefrontConfig = {
      ...config,
      gallery: {
        ...config.gallery,
        images: Array.from({ length: LIMITS.galleryImages }, (_, i) => ({
          id: `66666666-6666-4666-8666-${String(i).padStart(12, "0")}`,
          path: path(`g${i}`),
          alt: "x",
        })),
      },
    };
    expect(setSlotImage(full, "gallery", path("extra"), { id: IMAGE_ID, alt: "Aros" }).ok).toBe(
      false,
    );
  });

  it("no borra de Storage una imagen que sigue publicada", () => {
    const published: StorefrontConfig = {
      ...defaultStorefrontConfig(),
      hero: { ...defaultStorefrontConfig().hero, imagePath: path("vieja") },
    };
    const draftBefore = published;
    const draftAfter: StorefrontConfig = {
      ...published,
      hero: { ...published.hero, imagePath: path("nueva") },
    };

    // Reemplazar en el borrador: la vieja sigue publicada, no se borra.
    expect(unreferencedImagePaths(draftBefore, [draftAfter, published])).toEqual([]);

    // Al publicar, la vieja ya no la usa nadie: se puede borrar.
    expect(unreferencedImagePaths(published, [draftAfter, draftAfter])).toEqual([
      path("vieja"),
    ]);
  });

  it("junta todas las imágenes usadas por una configuración", () => {
    const config: StorefrontConfig = {
      ...defaultStorefrontConfig(),
      hero: { ...defaultStorefrontConfig().hero, imagePath: path("h") },
      gallery: {
        title: "",
        subtitle: "",
        images: [{ id: IMAGE_ID, path: path("g"), alt: "G" }],
      },
    };
    expect([...imagePathsOf(config)].sort()).toEqual([path("g"), path("h")].sort());
  });
});
