import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicProduct } from "@/lib/catalog/products";
import { getRequestNow } from "@/lib/offers/request-time";
import { firstPresent, logoShareImage, pageMetadata, toDescription } from "@/lib/seo/metadata";
import { PriceTag } from "@/components/catalog/price-tag";
import { OfferCountdown } from "@/components/catalog/offer-clock";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { AddToCartForm } from "@/components/cart/add-to-cart-form";

type ProductoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness();
  if (!business) return {};

  const product = await getPublicProduct(business.id, slug);
  if (!product) return {};

  const cover = product.images[0];

  // Sin precio en la descripción: las redes guardan la vista previa y un
  // precio de oferta quedaría viejo al vencer.
  return pageMetadata({
    title: product.name,
    description:
      toDescription(product.description) ??
      `${product.name}${product.material ? ` · ${product.material}` : ""} en ${business.name}. ${
        product.inStock ? "Hacé tu pedido por WhatsApp." : "Sin stock por el momento."
      }`,
    path: `/productos/${product.slug}`,
    siteName: business.name,
    image: firstPresent(
      cover ? { url: cover.url, alt: product.name } : null,
      logoShareImage(business),
    ),
  });
}

export default async function ProductoPage({ params }: ProductoPageProps) {
  const { slug } = await params;
  const business = await getPublicBusiness();

  if (!business) {
    notFound();
  }

  // Resuelve por business_id + slug (nunca por nombre) y solo si está
  // available = true; getPublicProduct ya lo filtra server-side.
  const product = await getPublicProduct(business.id, slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 grid gap-8 py-10 md:grid-cols-2">
      <ProductGallery images={product.images} productName={product.name} />

      <div className="space-y-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-900">{product.name}</h1>
          <PriceTag
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            className="mt-1"
          />
          {product.offerEndsAt && (
            <div className="mt-3 space-y-2 rounded-lg bg-cream p-3">
              <p className="text-xs font-medium tracking-wide text-brand uppercase">
                Oferta: termina en
              </p>
              {/* Al llegar a 0 refresca: vuelve el precio normal. */}
              <OfferCountdown
                endsAt={product.offerEndsAt}
                serverNow={getRequestNow()}
              />
            </div>
          )}
          {/* Solo el estado, nunca cantidades. */}
          <p
            className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${
              product.inStock ? "text-green-700" : "text-zinc-500"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                product.inStock ? "bg-green-600" : "bg-zinc-400"
              }`}
            />
            {product.inStock ? "En stock" : "Sin stock"}
          </p>
        </div>

        {product.material && (
          <p className="text-sm text-zinc-600">Material: {product.material}</p>
        )}

        {product.description && (
          <p className="whitespace-pre-line text-zinc-700">
            {product.description}
          </p>
        )}

        <AddToCartForm
          product={product}
          mainImageUrl={product.images[0]?.url ?? null}
        />
      </div>
    </div>
  );
}
