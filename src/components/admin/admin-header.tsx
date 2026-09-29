"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  productos: "Productos",
  categorias: "Categorías",
  configuracion: "Configuración",
};

const CHILD_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  importar: "Importar",
};

/**
 * Migas solo en subpáginas (ej: Productos › Editar). En las secciones de
 * primer nivel el título ya lo muestra la página y el sidebar marca la
 * sección activa, así que el encabezado no lo repite.
 */
function getCrumbs(pathname: string) {
  const [, , section, child] = pathname.split("/");
  if (!section || !child || !SECTION_LABELS[section]) return [];

  return [
    { label: SECTION_LABELS[section], href: `/admin/${section}` },
    { label: CHILD_LABELS[child] ?? "Editar" },
  ];
}

export function AdminHeader() {
  const pathname = usePathname();
  const crumbs = getCrumbs(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar menú" />

      {crumbs.length > 0 && (
        <>
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.label}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      )}
    </header>
  );
}
