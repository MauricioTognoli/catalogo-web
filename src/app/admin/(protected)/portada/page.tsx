import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { getAdminStorefront, storefrontImageUrl } from "@/lib/storefront/queries";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { BusinessRequired } from "@/components/admin/business-required";
import { HeroEditor } from "./hero-editor";
import { FeaturedEditor, type FeaturedOption } from "./featured-editor";
import { CollectionEditor } from "./collection-editor";
import { PromoEditor } from "./promo-editor";
import { GalleryEditor } from "./gallery-editor";
import { PublishActions } from "./publish-actions";
import {
  STOREFRONT_SECTIONS,
  StorefrontTabs,
  type StorefrontSectionKey,
} from "./storefront-tabs";

export const metadata: Metadata = {
  title: "Portada",
};

type ProductOptionRow = {
  id: string;
  name: string;
  available: boolean;
  product_image: { url: string; position: number }[];
};

/**
 * Key de un editor: solo sus textos, sin las imágenes. Así el editor se
 * reinicia cuando el borrador cambia desde afuera (descartar, publicar,
 * guardar) pero no al subir una imagen, que no debe borrar lo que se
 * está escribiendo.
 */
function textKey(value: object): string {
  return JSON.stringify(value, (key, field) => (key === "imagePath" ? undefined : field));
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PortadaPage({
  searchParams,
}: PageProps<"/admin/portada">) {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <>
        <PageHeader title="Portada" />
        <BusinessRequired description="Necesitás configurar tu negocio antes de diseñar la portada." />
      </>
    );
  }

  const supabase = await createClient();
  const [storefront, categoriesResult, productsResult, { seccion }] = await Promise.all([
    getAdminStorefront(business.id),
    supabase
      .from("category")
      .select("id, name")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase
      .from("product")
      .select("id, name, available, product_image(url, position)")
      .eq("business_id", business.id)
      .order("name", { ascending: true })
      .returns<ProductOptionRow[]>(),
    searchParams,
  ]);

  if (categoriesResult.error || productsResult.error) {
    throw categoriesResult.error ?? productsResult.error;
  }

  const products: FeaturedOption[] = productsResult.data.map((product) => ({
    id: product.id,
    name: product.name,
    available: product.available,
    coverUrl:
      [...product.product_image].sort((a, b) => a.position - b.position)[0]?.url ??
      null,
  }));
  const options = { categories: categoriesResult.data, products };
  const { draft, hasChanges, publishedAt } = storefront;

  const initialSection = STOREFRONT_SECTIONS.some((item) => item.value === seccion)
    ? (seccion as StorefrontSectionKey)
    : "principal";

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Portada
            {hasChanges ? (
              <Badge variant="outline" className="border-warning/50 text-warning">
                Cambios sin publicar
              </Badge>
            ) : (
              <Badge variant="secondary">Publicada</Badge>
            )}
          </span>
        }
        description={
          publishedAt
            ? `Editás un borrador; la tienda cambia al publicar. Última publicación: ${dateFormatter.format(new Date(publishedAt))}.`
            : "Editás un borrador; la tienda cambia al publicar."
        }
        actions={<PublishActions hasChanges={hasChanges} />}
      />

      <StorefrontTabs
        initialSection={initialSection}
        panels={{
          principal: (
            <HeroEditor
              key={textKey(draft.hero)}
              hero={draft.hero}
              imageUrl={storefrontImageUrl(draft.hero.imagePath)}
              businessName={business.name}
              options={options}
            />
          ),
          destacados: (
            <FeaturedEditor
              key={textKey(draft.featured)}
              productIds={draft.featured.productIds}
              products={products}
            />
          ),
          colecciones: (
            <div className="grid gap-6 xl:grid-cols-2">
              {([0, 1] as const).map((index) => (
                <CollectionEditor
                  key={`${index}-${textKey(draft.collections[index])}`}
                  index={index}
                  block={draft.collections[index]}
                  imageUrl={storefrontImageUrl(draft.collections[index].imagePath)}
                  options={options}
                />
              ))}
            </div>
          ),
          promocion: (
            <PromoEditor
              key={textKey({ promo: draft.promo, announcement: draft.announcement })}
              promo={draft.promo}
              announcement={draft.announcement}
              imageUrl={storefrontImageUrl(draft.promo.imagePath)}
              options={options}
            />
          ),
          galeria: (
            <GalleryEditor
              key={textKey({ title: draft.gallery.title, subtitle: draft.gallery.subtitle })}
              title={draft.gallery.title}
              subtitle={draft.gallery.subtitle}
              images={draft.gallery.images.map((image) => ({
                id: image.id,
                url: storefrontImageUrl(image.path)!,
                alt: image.alt,
              }))}
            />
          ),
        }}
      />
    </>
  );
}
