import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { formatPrice } from "@/lib/utils/formatPrice";
import { LogoutButton } from "@/components/admin/logout-button";
import { DashboardStat } from "@/components/admin/dashboard-stat";
import { QuickAccessLink } from "@/components/admin/quick-access-link";

type DashboardProductRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  category_id: string | null;
  created_at: string;
  product_image: { id: string }[];
};

const LATEST_PRODUCTS_LIMIT = 5;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El proxy ya protege esta ruta; esta verificación es una capa
  // adicional por si la página se renderiza fuera de ese matcher.
  if (!user) {
    redirect("/admin/login");
  }

  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como <strong>{user.email}</strong>.
        </p>
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Todavía no configuraste tu negocio.
          </p>
          <Link
            href="/admin/configuracion"
            className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Configurar negocio
          </Link>
        </div>
        <LogoutButton />
      </main>
    );
  }

  const [
    { data: products, error: productsError },
    { count: categoryCount, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("product")
      .select(
        "id, name, price, available, category_id, created_at, product_image(id)",
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .returns<DashboardProductRow[]>(),
    supabase
      .from("category")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id),
  ]);

  if (productsError || categoriesError) {
    throw productsError ?? categoriesError;
  }

  const totalProducts = products.length;
  const availableProducts = products.filter((product) => product.available).length;
  const productsWithoutCategory = products.filter(
    (product) => product.category_id === null,
  ).length;
  const productsWithoutImage = products.filter(
    (product) => product.product_image.length === 0,
  ).length;
  const latestProducts = products.slice(0, LATEST_PRODUCTS_LIMIT);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {business.logo_url ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
              <Image
                src={business.logo_url}
                alt={`Logo de ${business.name}`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {business.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{business.name}</h1>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              WhatsApp: {business.whatsapp_number}
            </p>
          </div>
        </div>

        <LogoutButton />
      </div>

      {availableProducts > 0 ? (
        <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="font-medium">
            Tu catálogo público muestra {availableProducts}{" "}
            {availableProducts === 1
              ? "producto disponible"
              : "productos disponibles"}
            .
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Ver catálogo público ↗
          </a>
        </div>
      ) : (
        <div className="rounded border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <p className="font-medium">
            Todavía no tenés productos disponibles en tu catálogo público.
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Los visitantes no van a ver ningún producto hasta que agregues o
            actives al menos uno.
          </p>
          <Link
            href="/admin/productos"
            className="mt-2 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Ir a productos
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DashboardStat label="Productos" value={totalProducts} />
          <DashboardStat label="Disponibles" value={availableProducts} />
          <DashboardStat label="Categorías" value={categoryCount ?? 0} />
        </div>

        {(productsWithoutCategory > 0 || productsWithoutImage > 0) && (
          <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            {productsWithoutCategory > 0 && (
              <p>
                {productsWithoutCategory}{" "}
                {productsWithoutCategory === 1
                  ? "producto sin categoría"
                  : "productos sin categoría"}
              </p>
            )}
            {productsWithoutImage > 0 && (
              <p>
                {productsWithoutImage}{" "}
                {productsWithoutImage === 1
                  ? "producto sin imágenes"
                  : "productos sin imágenes"}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <QuickAccessLink href="/admin/productos" label="Productos" />
          <QuickAccessLink
            href="/admin/productos/nuevo"
            label="Nuevo producto"
          />
          <QuickAccessLink href="/admin/categorias" label="Categorías" />
          <QuickAccessLink href="/admin/configuracion" label="Configuración" />
          <QuickAccessLink href="/" label="Ver catálogo público" external />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimos productos</h2>

        {latestProducts.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">
              Todavía no tenés productos.
            </p>
            <Link
              href="/admin/productos/nuevo"
              className="mt-2 inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Crear el primero
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {latestProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      product.available
                        ? "text-xs font-medium text-green-700 dark:text-green-400"
                        : "text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    }
                  >
                    {product.available ? "Disponible" : "No disponible"}
                  </span>
                  <Link
                    href={`/admin/productos/${product.id}`}
                    className="text-sm hover:underline"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
