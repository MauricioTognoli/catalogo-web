import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchForm } from "@/components/catalog/search-form";
import { SiteFooter } from "@/components/catalog/site-footer";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

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

  const categories = await getPublicCategories(business.id);

  return (
    <CartProvider>
      <div
        className={`${playfair.variable} flex min-h-screen flex-col bg-white text-zinc-900`}
      >
        <div className="bg-brand px-4 py-2 text-center text-xs font-medium tracking-wide text-brand-foreground">
          Envíos a todo el país · Coordinamos por WhatsApp
        </div>

        <header className="border-b border-zinc-200">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {business.logo_url ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                    <Image
                      src={business.logo_url}
                      alt={`Logo de ${business.name}`}
                      fill
                      sizes="40px"
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
                <span className="truncate font-serif text-xl">
                  {business.name}
                </span>
              </Link>

              <div className="hidden flex-1 justify-center px-8 sm:flex">
                <SearchForm className="max-w-sm" />
              </div>

              <div className="shrink-0">
                <CartButton />
              </div>
            </div>

            <div className="sm:hidden">
              <SearchForm />
            </div>

            {categories.length > 0 && (
              <nav
                aria-label="Categorías"
                className="flex min-w-0 gap-6 overflow-x-auto text-sm sm:flex-wrap sm:overflow-visible"
              >
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categorias/${category.slug}`}
                    className="shrink-0 tracking-wide text-zinc-600 uppercase hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>

        <SiteFooter business={business} categories={categories} />
      </div>

      <CartDrawer business={business} />
    </CartProvider>
  );
}
