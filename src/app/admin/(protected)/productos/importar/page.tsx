import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Info } from "lucide-react";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { IMPORT_LIMITS } from "@/lib/import/product-import";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { ProductImporter } from "./product-importer";

export const metadata: Metadata = {
  title: "Importar productos",
};

export default async function ImportarProductosPage() {
  const business = await getCurrentBusiness();
  if (!business) {
    redirect("/admin/configuracion");
  }

  return (
    <>
      <PageHeader
        title="Importar productos"
        description="Cargá muchos productos nuevos de una vez desde una planilla de Excel."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>1. Descargá la plantilla</CardTitle>
            <CardDescription>
              Columnas: Nombre, Descripción, Precio, Material, Categoría,
              Disponibilidad y Stock. Obligatorios: nombre, precio y stock.
              Incluye instrucciones y la lista de tus categorías.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              {/* <a> y no <Link>: es una descarga desde un route handler. */}
              <a href="/admin/productos/importar/plantilla" download>
                <Download />
                Descargar plantilla .xlsx
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="size-4" aria-hidden="true" />
              Limitaciones de esta versión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
              <li>
                Crea productos <strong className="text-foreground">sin talles ni imágenes</strong>:
                agregalos después desde la ficha de cada producto.
              </li>
              <li>Solo crea productos nuevos: no modifica los existentes.</li>
              <li>Las categorías tienen que existir antes; no se crean solas.</li>
              <li>
                Si alguna fila tiene errores, no se importa ninguna. Hasta{" "}
                {IMPORT_LIMITS.maxRows} productos por archivo.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <ProductImporter />
    </>
  );
}
