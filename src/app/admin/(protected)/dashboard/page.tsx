import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  FolderPlus,
  FolderTree,
  Gem,
  ImageOff,
  PackagePlus,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { formatPrice } from "@/lib/utils/formatPrice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { DashboardStat } from "@/components/admin/dashboard-stat";
import { EmptyState } from "@/components/admin/empty-state";
import { BusinessRequired } from "@/components/admin/business-required";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { CopyStoreLinkButton } from "@/components/admin/copy-store-link-button";

export const metadata: Metadata = {
  title: "Inicio",
};

type DashboardProductRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  category_id: string | null;
  created_at: string;
  product_image: { url: string; position: number }[];
};

const LATEST_PRODUCTS_LIMIT = 5;

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default async function DashboardPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <>
        <PageHeader
          title="Bienvenido"
          description="Estás a un paso de publicar tu catálogo."
        />
        <BusinessRequired description="Cargá el nombre y el WhatsApp de tu joyería. Es el número al que van a llegar los pedidos del carrito." />
      </>
    );
  }

  const supabase = await createClient();
  const [
    { data: products, error: productsError },
    { count: categoryCount, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("product")
      .select(
        "id, name, price, available, category_id, created_at, product_image(url, position)",
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
  const hiddenProducts = totalProducts - availableProducts;
  const withoutCategory = products.filter(
    (product) => product.category_id === null,
  ).length;
  const withoutImage = products.filter(
    (product) => product.product_image.length === 0,
  ).length;
  const categories = categoryCount ?? 0;
  const latestProducts = products.slice(0, LATEST_PRODUCTS_LIMIT);

  const setupSteps = [
    {
      label: "Cargar los datos y el WhatsApp del negocio",
      done: true,
      href: "/admin/configuracion",
    },
    {
      label: "Subir el logo",
      done: business.logo_url !== null,
      href: "/admin/configuracion",
    },
    {
      label: "Crear al menos una categoría",
      done: categories > 0,
      href: "/admin/categorias?nueva=1",
    },
    {
      label: "Publicar el primer producto",
      done: availableProducts > 0,
      href: totalProducts > 0 ? "/admin/productos" : "/admin/productos/nuevo",
    },
    {
      label: "Agregar fotos a todos los productos",
      done: totalProducts > 0 && withoutImage === 0,
      href: "/admin/productos?estado=sin-imagen",
    },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const setupComplete = completedSteps === setupSteps.length;

  const pendingTasks = [
    withoutImage > 0 && {
      icon: ImageOff,
      label: plural(withoutImage, "producto sin imágenes", "productos sin imágenes"),
      hint: "Las fotos son lo primero que miran tus clientes.",
      href: "/admin/productos?estado=sin-imagen",
    },
    withoutCategory > 0 &&
      categories > 0 && {
        icon: Tag,
        label: plural(withoutCategory, "producto sin categoría", "productos sin categoría"),
        hint: "No aparecen al filtrar por categoría en la tienda.",
        href: "/admin/productos?estado=sin-categoria",
      },
  ].filter((task) => task !== false);

  return (
    <>
      <PageHeader
        title="Inicio"
        description={
          availableProducts > 0
            ? `Tu tienda muestra ${plural(availableProducts, "producto", "productos")}.`
            : "Tu tienda todavía no muestra productos."
        }
        actions={
          <>
            <CopyStoreLinkButton variant="outline">Copiar enlace</CopyStoreLinkButton>
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <PackagePlus />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardStat
          label="Productos"
          value={totalProducts}
          icon={Gem}
          href="/admin/productos"
        />
        <DashboardStat
          label="Visibles"
          value={availableProducts}
          hint="Se muestran en la tienda"
          icon={Eye}
          href="/admin/productos?estado=visibles"
        />
        <DashboardStat
          label="Ocultos"
          value={hiddenProducts}
          hint="No aparecen en la tienda"
          icon={EyeOff}
          href="/admin/productos?estado=ocultos"
        />
        <DashboardStat
          label="Categorías"
          value={categories}
          icon={FolderTree}
          href="/admin/categorias"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Últimos productos</CardTitle>
            <CardDescription>Los más recientes que cargaste.</CardDescription>
            {totalProducts > 0 && (
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/productos">
                    Ver todos
                    <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {latestProducts.length === 0 ? (
              <EmptyState
                icon={Gem}
                title="Todavía no cargaste productos"
                description="Creá el primero: nombre, precio y fotos alcanzan para publicarlo."
                action={
                  <Button asChild>
                    <Link href="/admin/productos/nuevo">
                      <PackagePlus />
                      Crear producto
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="-mx-2 divide-y">
                {latestProducts.map((product) => {
                  const cover = [...product.product_image].sort(
                    (a, b) => a.position - b.position,
                  )[0];

                  return (
                    <li key={product.id}>
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="flex items-center gap-3 rounded-md px-2 py-2.5 outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <ProductThumbnail url={cover?.url ?? null} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product.name}
                          </p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        {!product.available && (
                          <Badge variant="secondary">Oculto</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {!setupComplete && (
            <Card>
              <CardHeader>
                <CardTitle>Puesta en marcha</CardTitle>
                <CardDescription>
                  {completedSteps} de {setupSteps.length} pasos completos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Progreso de la puesta en marcha"
                  aria-valuemin={0}
                  aria-valuemax={setupSteps.length}
                  aria-valuenow={completedSteps}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(completedSteps / setupSteps.length) * 100}%`,
                    }}
                  />
                </div>
                <ul className="space-y-1">
                  {setupSteps.map((step) => (
                    <li key={step.label}>
                      {step.done ? (
                        <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground line-through">
                          <CheckCircle2
                            className="size-4 shrink-0 text-success"
                            aria-label="Completo"
                          />
                          {step.label}
                        </p>
                      ) : (
                        <Link
                          href={step.href}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <Circle
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-label="Pendiente"
                          />
                          {step.label}
                          <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Para revisar</CardTitle>
              <CardDescription>Detalles que mejoran tu catálogo.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  Todo en orden por ahora.
                </p>
              ) : (
                <ul className="-mx-2 space-y-1">
                  {pendingTasks.map((task) => (
                    <li key={task.href}>
                      <Link
                        href={task.href}
                        className="flex items-start gap-3 rounded-md px-2 py-2 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <task.icon
                          className="mt-0.5 size-4 shrink-0 text-warning"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {task.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {task.hint}
                          </span>
                        </span>
                        <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {setupComplete && (
            <Card>
              <CardHeader>
                <CardTitle>Accesos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/categorias?nueva=1">
                    <FolderPlus />
                    Nueva categoría
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/productos?estado=ocultos">
                    <EyeOff />
                    Revisar productos ocultos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
