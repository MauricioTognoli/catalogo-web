"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/configuracion", label: "Configuración" },
] as const;

const LINK_CLASSNAME =
  "shrink-0 border-b-2 border-transparent pb-1 text-sm text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100";

const ACTIVE_LINK_CLASSNAME =
  "shrink-0 border-b-2 border-zinc-900 pb-1 text-sm font-semibold text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-100 dark:text-zinc-100 dark:focus-visible:outline-zinc-100";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Panel de administración"
      className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto sm:flex-none sm:overflow-visible"
    >
      {NAV_LINKS.map((link) => {
        // /admin/productos también debe marcarse activo en sus subrutas
        // (/admin/productos/nuevo, /admin/productos/[id]).
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? ACTIVE_LINK_CLASSNAME : LINK_CLASSNAME}
          >
            {link.label}
          </Link>
        );
      })}

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASSNAME}
      >
        Ver catálogo ↗
      </a>
    </nav>
  );
}
