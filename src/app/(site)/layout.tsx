import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/catalog/business";
import { getPublicCategories } from "@/lib/catalog/categories";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";

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
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
            >
              {business.logo_url ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {business.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-lg font-semibold">{business.name}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-4">
              {categories.length > 0 && (
                <nav aria-label="Categorías" className="flex flex-wrap gap-4 text-sm">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/categorias/${category.slug}`}
                      className="text-zinc-600 hover:text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
              )}

              <CartButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {business.name}
        </footer>
      </div>

      <CartDrawer />
    </CartProvider>
  );
}
