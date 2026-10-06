import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { filterByCategory, getPublicProducts } from "@/lib/catalog/products";
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
import { pageMetadata, toDescription } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/seo/site-url";
import { homeJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
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
import { inStockFirst } from "@/lib/stock/availability";

const NEW_ARRIVALS_LIMIT = 8;
const TOP_PRODUCTS_PER_CATEGORY = 4;
const SHARE_IMAGE_PATH = "/og-image.jpg";

export async function generateMetadata(): Promise<Metadata> {
  const business = await getPublicBusiness();

  if (!business) {
    return {};
  }

  // Siempre la portada PUBLICADA: la vista previa no cambia lo que se
  // comparte ni lo que ven los buscadores.
  const published = await getPublishedStorefront(business.id);

  return pageMetadata({
    title: business.name,
    absoluteTitle: true,
    description:
      toDescription(published.hero.description) ??
      `Conocé los productos de ${business.name} y hacé tu pedido por WhatsApp.`,
    path: "/",
    siteName: business.name,
    image: { url: SHARE_IMAGE_PATH, alt: business.name, width: 1200, height: 630 },
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

  const categoryGroups = categories.map((category) => ({
    category,
    products: filterByCategory(products, category.id).slice(
      0,
      TOP_PRODUCTS_PER_CATEGORY,
    ),
  }));

  const newArrivals = products.slice(0, NEW_ARRIVALS_LIMIT);
  const featured = inStockFirst(visibleFeatured(config.featured.productIds, products));

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
      <JsonLd data={homeJsonLd(business, getSiteUrl())} />

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
