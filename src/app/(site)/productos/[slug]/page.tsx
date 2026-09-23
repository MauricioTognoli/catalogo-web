import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicProduct } from "@/lib/catalog/products";
import { formatPrice } from "@/lib/utils/formatPrice";
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

  return {
    title: `${product.name} | ${business.name}`,
    description:
      product.description ?? `${product.name}, disponible en ${business.name}.`,
  };
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
    <div className="grid gap-8 md:grid-cols-2">
      <ProductGallery images={product.images} productName={product.name} />

      <div className="space-y-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-900">{product.name}</h1>
          <p className="mt-1 text-xl font-semibold text-brand">
            {formatPrice(product.price)}
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
