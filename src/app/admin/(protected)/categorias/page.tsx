import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { BusinessRequired } from "@/components/admin/business-required";
import { CreateCategoryButton } from "./create-category-button";
import { CategoryRow } from "./category-row";

export const metadata: Metadata = {
  title: "Categorías",
};

type CategoryListRow = {
  id: string;
  name: string;
  slug: string;
  position: number;
  // Agregado de PostgREST: una sola fila con el conteo de productos.
  product: { count: number }[];
};

export default async function CategoriasPage({
  searchParams,
}: PageProps<"/admin/categorias">) {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <>
        <PageHeader title="Categorías" />
        <BusinessRequired description="Necesitás configurar tu negocio antes de crear categorías." />
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: categories, error }, { nueva }] = await Promise.all([
    supabase
      .from("category")
      .select("id, name, slug, position, product(count)")
      .eq("business_id", business.id)
      .order("position", { ascending: true })
      .returns<CategoryListRow[]>(),
    searchParams,
  ]);

  if (error) {
    throw error;
  }

  const openCreate = nueva === "1";

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Agrupan tus productos en la tienda. Se muestran según su posición."
        actions={
          categories.length > 0 && <CreateCategoryButton defaultOpen={openCreate} />
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Todavía no tenés categorías"
          description="Ayudan a tus clientes a encontrar lo que buscan: anillos, aros, collares..."
          action={
            <CreateCategoryButton
              defaultOpen={openCreate}
              label="Crear la primera"
            />
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Nombre</TableHead>
                <TableHead className="w-28 text-right">Productos</TableHead>
                <TableHead className="hidden w-24 text-right sm:table-cell">
                  Posición
                </TableHead>
                <TableHead className="w-14 pr-4">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(({ product, ...category }) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  productCount={product[0]?.count ?? 0}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
