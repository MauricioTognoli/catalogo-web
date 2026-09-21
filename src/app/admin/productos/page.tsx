import Link from "next/link";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/formatPrice";
import { ToggleAvailabilityButton } from "./toggle-availability-button";

type ProductListRow = {
  id: string;
  name: string;
  price: number;
  material: string | null;
  available: boolean;
  // category_id es una FK "muchos a uno": PostgREST devuelve un único
  // objeto (o null), no un array. Sin tipos generados de Supabase, el
  // cliente infiere "any[]" por defecto; se corrige con `.returns<T>()`.
  category: { name: string } | null;
};

export default async function ProductosPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Necesitás configurar tu negocio antes de crear productos.
        </p>
        <Link
          href="/admin/configuracion"
          className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Configurar negocio
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("product")
    .select("id, name, price, material, available, category:category_id(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .returns<ProductListRow[]>();

  if (error) {
    throw error;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gestioná el catálogo de tu negocio.
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Todavía no tenés productos. Creá el primero con el botón de
            arriba.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Categoría</th>
              <th className="py-2 font-medium">Precio</th>
              <th className="py-2 font-medium">Material</th>
              <th className="py-2 font-medium">Disponibilidad</th>
              <th className="py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-zinc-200 dark:border-zinc-800"
              >
                <td className="py-3">{product.name}</td>
                <td className="py-3 text-zinc-500">
                  {product.category?.name ?? "Sin categoría"}
                </td>
                <td className="py-3">{formatPrice(product.price)}</td>
                <td className="py-3 text-zinc-500">
                  {product.material ?? "—"}
                </td>
                <td className="py-3">
                  <ToggleAvailabilityButton
                    productId={product.id}
                    available={product.available}
                  />
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/productos/${product.id}`}
                    className="text-sm hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
