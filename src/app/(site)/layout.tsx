import { Suspense } from "react";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { getPublicBusiness, type PublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchForm } from "@/components/catalog/search-form";
import { SiteFooter } from "@/components/catalog/site-footer";
import { PreviewBar } from "@/components/catalog/preview-bar";
import { STORE_CONTAINER } from "@/components/catalog/store-section";
import { StoreBrandProvider, StoreLoader } from "@/components/catalog/store-loader";
import { LinkPendingIndicator } from "@/components/catalog/link-pending-indicator";
import { getPublicStorefront } from "@/lib/storefront/queries";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const business = await getPublicBusiness();
  if (!business) return {};

  // La vista previa de la portada (borrador) nunca se indexa.
  const { isEnabled: isPreview } = await draftMode();

  return {
    title: { default: business.name, template: `%s · ${business.name}` },
    applicationName: business.name,
    openGraph: { type: "website", locale: "es_AR", siteName: business.name },
    ...(isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getPublicBusiness();

  // Sin negocio configurado todavía: no hay catálogo público que mostrar.
  if (!business) {
    notFound();
  }

  const brand = { name: business.name, logoUrl: business.logo_url };

  return (
    <CartProvider>
      <StoreBrandProvider brand={brand}>
        <div
          className={`${playfair.variable} flex min-h-screen flex-col bg-white text-zinc-900`}
        >
          <Suspense
            fallback={<StoreLoader message="Cargando catálogo…" className="min-h-screen" />}
          >
            <StoreFrame business={business}>{children}</StoreFrame>
          </Suspense>
        </div>
      </StoreBrandProvider>

      <CartDrawer business={business} />
    </CartProvider>
  );
}

async function StoreFrame({
  business,
  children,
}: {
  business: PublicBusiness;
  children: React.ReactNode;
}) {
  const [categories, { config: storefront, isPreview }] = await Promise.all([
    getPublicCategories(business.id),
    getPublicStorefront(business.id),
  ]);

  return (
    <>
      {isPreview && <PreviewBar />}

      {storefront.announcement && (
        <div className="bg-brand px-4 py-2 text-center text-xs font-medium tracking-[0.15em] text-brand-foreground uppercase">
          {storefront.announcement}
        </div>
      )}

      <header className="border-b border-zinc-200 bg-white">
        <div
          className={`flex items-center gap-4 py-4 md:gap-8 ${STORE_CONTAINER}`}
        >
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {business.logo_url ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-transparent">
                <Image
                  src={business.logo_url}
                  alt={`Logo de ${business.name}`}
                  fill
                  sizes="70px"
                  className="object-cover"
                />
              </div>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground"
              >
                {business.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-serif text-2xl">
              {business.name}
            </span>
          </Link>

          <div className="hidden flex-1 md:block">
            <SearchForm className="mx-auto max-w-xl" inputId="q-desktop" />
          </div>

          <div className="ml-auto shrink-0 md:ml-0">
            <CartButton />
          </div>
        </div>

        <div className={`pb-4 md:hidden ${STORE_CONTAINER}`}>
          <SearchForm inputId="q-mobile" />
        </div>

        {categories.length > 0 && (
          <nav aria-label="Categorías" className="border-t border-zinc-100">
            <ul
              className={`flex min-w-0 gap-8 overflow-x-auto py-3 text-xs md:flex-wrap md:justify-center md:overflow-visible ${STORE_CONTAINER}`}
            >
              {categories.map((category) => (
                <li key={category.id} className="shrink-0">
                  <Link
                    href={`/categorias/${category.slug}`}
                    className="font-medium tracking-[0.15em] text-zinc-700 uppercase hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {category.name}
                    <LinkPendingIndicator variant="inline" className="ml-2" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter business={business} categories={categories} />
    </>
  );
}
