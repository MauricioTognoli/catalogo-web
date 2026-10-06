import type { PublicBusiness } from "@/lib/catalog/business";
import type { PublicProductDetail } from "@/lib/catalog/products";
import { utcToZonedLocal } from "@/lib/offers/time";
import { DEFAULT_CURRENCY } from "@/lib/utils/formatPrice";
import { hasWhatsAppNumber } from "@/lib/whatsapp/buildWhatsAppUrl";

type JsonLdObject = Record<string, unknown>;

type BusinessData = Pick<
  PublicBusiness,
  "name" | "logo_url" | "email" | "address" | "instagram_url" | "whatsapp_number"
>;

const CONTEXT = "https://schema.org";

const BACKSLASH = String.fromCharCode(92);

export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(
    /[<>&]/g,
    (char) => `${BACKSLASH}u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function absolute(path: string, siteUrl: URL): string {
  return new URL(path, siteUrl).href;
}

function organizationId(siteUrl: URL): string {
  return `${absolute("/", siteUrl)}#organization`;
}

export function organizationJsonLd(business: BusinessData, siteUrl: URL): JsonLdObject {
  const address = business.address?.trim();
  const email = business.email?.trim();

  return {
    "@type": "Organization",
    "@id": organizationId(siteUrl),
    name: business.name,
    url: absolute("/", siteUrl),
    ...(business.logo_url ? { logo: business.logo_url } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
    ...(business.instagram_url ? { sameAs: [business.instagram_url] } : {}),
    ...(hasWhatsAppNumber(business.whatsapp_number)
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            telephone: `+${business.whatsapp_number.trim()}`,
            contactType: "sales",
            availableLanguage: "es",
          },
        }
      : {}),
  };
}

export function homeJsonLd(business: BusinessData, siteUrl: URL): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@graph": [
      organizationJsonLd(business, siteUrl),
      {
        "@type": "WebSite",
        "@id": `${absolute("/", siteUrl)}#website`,
        name: business.name,
        url: absolute("/", siteUrl),
        inLanguage: "es-AR",
        publisher: { "@id": organizationId(siteUrl) },
      },
    ],
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
  siteUrl: URL,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path, siteUrl),
    })),
  };
}

export function lastValidDate(endsAt: string): string {
  return utcToZonedLocal(new Date(Date.parse(endsAt) - 1)).slice(0, 10);
}

export function productOfferJsonLd(
  product: Pick<PublicProductDetail, "price" | "inStock" | "offerEndsAt">,
  business: BusinessData,
  url: string,
  siteUrl: URL,
): JsonLdObject | null {
  if (!(product.price > 0) || !hasWhatsAppNumber(business.whatsapp_number)) {
    return null;
  }

  return {
    "@type": "Offer",
    url,
    price: product.price.toFixed(2),
    priceCurrency: DEFAULT_CURRENCY,
    availability: product.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    ...(product.offerEndsAt ? { priceValidUntil: lastValidDate(product.offerEndsAt) } : {}),
    seller: { "@type": "Organization", "@id": organizationId(siteUrl), name: business.name },
  };
}

export function productJsonLd(
  product: PublicProductDetail,
  business: BusinessData,
  siteUrl: URL,
): JsonLdObject {
  const url = absolute(`/productos/${product.slug}`, siteUrl);
  const description = product.description?.trim();
  const offer = productOfferJsonLd(product, business, url, siteUrl);

  return {
    "@context": CONTEXT,
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    ...(description ? { description } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((image) => image.url) } : {}),
    ...(product.material ? { material: product.material } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    ...(offer ? { offers: offer } : {}),
  };
}
