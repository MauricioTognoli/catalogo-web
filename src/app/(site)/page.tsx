import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { getPublicProducts } from "@/lib/catalog/products";
import {
  collectionHiddenReason,
  galleryHiddenReason,
  promoHiddenReason,
  resolveCta,
  visibleFeatured,
  type LinkContext,
} from "@/lib/storefront/config";
import {
  getPublicStorefront,
  getPublishedStorefront,
  storefrontImageUrl,
} from "@/lib/storefront/queries";
import { firstPresent, logoShareImage, pageMetadata, toDescription } from "@/lib/seo/metadata";
import { ProductGrid } from "@/components/catalog/product-grid";
import { HeroBanner } from "@/components/catalog/hero-banner";
import { CategoryTabs } from "@/components/catalog/category-tabs";
import { SectionHeading } from "@/components/catalog/section-heading";
import { StoreSection } from "@/components/catalog/store-section";
import {
  CollectionBlocks,
  type CollectionBlockView,
} from "@/components/catalog/collection-blocks";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { ImageGallery } from "@/components/catalog/image-gallery";
import { OfferBanner } from "@/components/catalog/offer-banner";
import { OfferRefresher } from "@/components/catalog/offer-refresher";
import { getFeaturedOffer } from "@/lib/offers/queries";
import { getRequestNow } from "@/lib/offers/request-time";

const NEW_ARRIVALS_LIMIT = 8;
const TOP_PRODUCTS_PER_CATEGORY = 4;

export async function generateMetadata(): Promise<Metadata> {
  const business = await getPublicBusiness();

  if (!business) {
    return {};
  }

  // Siempre la portada PUBLICADA: la vista previa no cambia lo que se
  // comparte ni lo que ven los buscadores.
  const [published, products] = await Promise.all([
    getPublishedStorefront(business.id),
    getPublicProducts(business.id),
  ]);
  const heroImage = storefrontImageUrl(published.hero.imagePath);
  const productWithImage = products.find((product) => product.mainImageUrl);

  return pageMetadata({
    title: business.name,
    absoluteTitle: true,
    description:
      toDescription(published.hero.description) ??
      `Conocé los productos de ${business.name} y hacé tu pedido por WhatsApp.`,
    path: "/",
    siteName: business.name,
    image: firstPresent(
      heroImage ? { url: heroImage, alt: business.name } : null,
      productWithImage
        ? { url: productWithImage.mainImageUrl!, alt: productWithImage.name }
        : null,
      logoShareImage(business),
    ),
  });
}

export default async function HomePage() {
  const business = await getPublicBusiness();

  // El layout ya llama notFound() si no hay negocio; esto es solo una
  // guarda de tipos para que TypeScript angoste `business` acá abajo.
  if (!business) {
    return null;
  }

  const [categories, products, { config }, featuredOffer] = await Promise.all([
    getPublicCategories(business.id),
    getPublicProducts(business.id),
    getPublicStorefront(business.id),
    getFeaturedOffer(business.id),
  ]);

  // Un fetch por categoría (mismo getPublicProducts que ya usa la página
  // de categoría): PublicProductCard no trae category_id, así que no se
  // puede derivar esto filtrando la lista general en el cliente.
  const categoryGroups = await Promise.all(
    categories.map(async (category) => ({
      category,
      products: (await getPublicProducts(business.id, category.id)).slice(
        0,
        TOP_PRODUCTS_PER_CATEGORY,
      ),
    })),
  );

  const newArrivals = products.slice(0, NEW_ARRIVALS_LIMIT);
  const featured = visibleFeatured(config.featured.productIds, products);

  // Los botones solo apuntan a destinos que existen y se ven: si una
  // categoría se borró o un producto se ocultó, el botón no se dibuja.
  const links: LinkContext = {
    categories: new Map(categories.map((category) => [category.id, category.slug])),
    products: new Map(products.map((product) => [product.id, product.slug])),
    hasFeatured: featured.length > 0,
  };

  const collections: CollectionBlockView[] = config.collections
    .filter((block) => collectionHiddenReason(block) === null)
    .map((block) => ({
      imageUrl: storefrontImageUrl(block.imagePath)!,
      eyebrow: block.eyebrow,
      title: block.title,
      cta: resolveCta(block.cta, links),
    }));

  return (
    <>
      <HeroBanner
        eyebrow={config.hero.eyebrow}
        title={config.hero.title || business.name}
        description={config.hero.description}
        cta={resolveCta(config.hero.cta, links)}
        // Sin imagen propia se mantiene el comportamiento anterior: la
        // foto del producto más reciente.
        imageUrl={
          storefrontImageUrl(config.hero.imagePath) ??
          products[0]?.mainImageUrl ??
          null
        }
      />

      {categoryGroups.some((group) => group.products.length > 0) && (
        <StoreSection aria-labelledby="top-product-heading">
          <CategoryTabs
            groups={categoryGroups}
            heading={
              <SectionHeading
                id="top-product-heading"
                title="Por categoría"
                align="start"
              />
            }
          />
        </StoreSection>
      )}

      <StoreSection
        id="productos"
        tone="cream"
        aria-labelledby="new-arrivals-heading"
        className="scroll-mt-6"
      >
        <SectionHeading
          id="new-arrivals-heading"
          title="Novedades"
          className="mb-8"
        />

        {newArrivals.length === 0 ? (
          <p className="text-center text-zinc-600">
            Todavía no hay productos disponibles.
          </p>
        ) : (
          <ProductGrid products={newArrivals} />
        )}
      </StoreSection>

      <CollectionBlocks blocks={collections} />

      {featured.length > 0 && (
        <StoreSection
          id="destacados"
          tone="cream"
          aria-labelledby="featured-heading"
          className="scroll-mt-6"
        >
          <SectionHeading
            id="featured-heading"
            title="Destacados"
            className="mb-8"
          />
          <ProductGrid products={featured} layout="carousel" />
        </StoreSection>
      )}

      {/* La oferta destacada vigente reemplaza al banner de la Portada;
          al vencer vuelve el contenido publicado, sin volver a publicar. */}
      {featuredOffer ? (
        <OfferBanner offer={featuredOffer} serverNow={getRequestNow()} />
      ) : promoHiddenReason(config.promo) === null && (
        <PromoBanner
          imageUrl={storefrontImageUrl(config.promo.imagePath)}
          eyebrow={config.promo.eyebrow}
          title={config.promo.title}
          description={config.promo.description}
          cta={resolveCta(config.promo.cta, links)}
        />
      )}

      <OfferRefresher
        endsAt={[
          featuredOffer?.endsAt ?? null,
          ...products.map((product) => product.offerEndsAt),
        ]}
      />

      {galleryHiddenReason(config.gallery) === null && (
        <ImageGallery
          title={config.gallery.title}
          subtitle={config.gallery.subtitle}
          images={config.gallery.images.map((image) => ({
            id: image.id,
            url: storefrontImageUrl(image.path)!,
            alt: image.alt,
          }))}
        />
      )}
    </>
  );
}
