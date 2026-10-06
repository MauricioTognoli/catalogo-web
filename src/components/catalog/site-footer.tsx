import Image from "next/image";
import Link from "next/link";
import type { PublicBusiness } from "@/lib/catalog/business";
import type { PublicCategory } from "@/lib/catalog/categories";
import { hasWhatsAppNumber } from "@/lib/whatsapp/buildWhatsAppUrl";
import { STORE_CONTAINER } from "./store-section";

const LINK_CLASS =
  "hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const HEADING_CLASS = "text-sm font-semibold tracking-wide text-zinc-900 uppercase";

const EXPLORE_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#productos", label: "Novedades" },
  { href: "/buscar", label: "Buscar productos" },
];

export function SiteFooter({
  business,
  categories,
}: {
  business: PublicBusiness;
  categories: PublicCategory[];
}) {
  const hasWhatsApp = hasWhatsAppNumber(business.whatsapp_number);
  const hasContact = hasWhatsApp || business.email;

  return (
    <footer className="bg-cream text-cream-foreground">
      <div
        className={`grid grid-cols-2 gap-10 py-14 md:grid-cols-4 lg:grid-cols-5 ${STORE_CONTAINER}`}
      >
        <div className="col-span-2 space-y-3 md:col-span-4 lg:col-span-1">
          <Link href="/" className={`inline-flex items-center gap-3 ${LINK_CLASS}`}>
            {business.logo_url && (
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white">
                <Image
                  src={business.logo_url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
            )}
            <span className="font-serif text-2xl">{business.name}</span>
          </Link>
          <p className="text-sm text-zinc-600">
            Catálogo online de {business.name}. Armá tu pedido y envialo por
            WhatsApp.
          </p>
        </div>

        {categories.length > 0 && (
          <nav aria-label="Categorías" className="space-y-3">
            <p className={HEADING_CLASS}>Categorías</p>
            <ul className="space-y-2 text-sm text-zinc-600">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/categorias/${category.slug}`} className={LINK_CLASS}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <nav aria-label="Explorar" className="space-y-3">
          <p className={HEADING_CLASS}>Explorar</p>
          <ul className="space-y-2 text-sm text-zinc-600">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {hasContact && (
          <div className="space-y-3">
            <p className={HEADING_CLASS}>Contacto</p>
            <ul className="space-y-2 text-sm text-zinc-600">
              {hasWhatsApp && (
                <li>
                  <a
                    href={`https://wa.me/${business.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASS}
                  >
                    WhatsApp: +{business.whatsapp_number}
                  </a>
                </li>
              )}
              {business.email && (
                <li>
                  <a href={`mailto:${business.email}`} className={`break-all ${LINK_CLASS}`}>
                    {business.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {business.address && (
          <div className="space-y-3">
            <p className={HEADING_CLASS}>Dirección</p>
            <address className="text-sm whitespace-pre-line text-zinc-600 not-italic">
              {business.address}
            </address>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200">
        <div
          className={`flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-zinc-600 ${STORE_CONTAINER}`}
        >
          <p>{business.name}</p>
          {business.instagram_url && (
            <a
              href={business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram de ${business.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
