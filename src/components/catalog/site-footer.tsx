import Link from "next/link";
import type { PublicBusiness } from "@/lib/catalog/business";
import type { PublicCategory } from "@/lib/catalog/categories";

export function SiteFooter({
  business,
  categories,
}: {
  business: PublicBusiness;
  categories: PublicCategory[];
}) {
  const hasContact = business.email || business.address || business.whatsapp_number;

  return (
    <footer className="border-t border-zinc-200 bg-cream text-cream-foreground">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div className="space-y-3">
          <p className="font-serif text-xl">{business.name}</p>
          <p className="text-sm text-zinc-600">
            Catálogo online de {business.name}.
          </p>
          {business.instagram_url && (
            <a
              href={business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
              </svg>
              Instagram
            </a>
          )}
        </div>

        {categories.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-wide text-zinc-900 uppercase">
              Shop
            </p>
            <ul className="space-y-2 text-sm text-zinc-600">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categorias/${category.slug}`}
                    className="hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasContact && (
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-wide text-zinc-900 uppercase">
              Contacto
            </p>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>WhatsApp: {business.whatsapp_number}</li>
              {business.email && <li>{business.email}</li>}
              {business.address && <li>{business.address}</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500">
        {business.name}
      </div>
    </footer>
  );
}
