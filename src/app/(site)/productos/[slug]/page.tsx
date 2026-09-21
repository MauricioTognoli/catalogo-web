import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicProduct } from "@/lib/catalog/products";
import { formatPrice } from "@/lib/utils/formatPrice";
import { ProductGallery } from "@/components/catalog/product-gallery";

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
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-xl font-semibold">
            {formatPrice(product.price)}
          </p>
        </div>

        {product.material && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Material: {product.material}
          </p>
        )}

        {product.description && (
          <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">
            {product.description}
          </p>
        )}

        {product.sizes.length > 0 && (
          <div>
            <h2 className="text-sm font-medium">Talles disponibles</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <li
                  key={size.id}
                  className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                >
                  {size.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
