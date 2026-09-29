"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ProductActionState } from "@/actions/products";
import { MAX_STOCK, type StockSummary } from "@/lib/stock/availability";
import { StockBadge } from "@/components/admin/stock-badge";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
};

type ProductFormDefaults = {
  productId?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  material?: string | null;
  available?: boolean;
  categoryId?: string | null;
  stock?: number | null;
};

type ProductFormProps = {
  action: (
    state: ProductActionState,
    formData: FormData,
  ) => Promise<ProductActionState>;
  categories: Category[];
  submitLabel: string;
  pendingLabel: string;
  /** Toast al guardar. Omitido en el alta, que redirige a la edición. */
  successMessage?: string;
  showSlugField?: boolean;
  defaultValues?: ProductFormDefaults;
  /**
   * Si el producto tiene talles, el stock se gestiona en cada talle y acá
   * solo se muestra el resumen. Sin talles, se carga en este formulario.
   */
  sizeStockSummary?: StockSummary | null;
};

// Radix Select no admite "" como valor de un ítem.
const NO_CATEGORY = "none";

export function ProductForm({
  action,
  categories,
  submitLabel,
  pendingLabel,
  successMessage,
  showSlugField = false,
  defaultValues,
  sizeStockSummary = null,
}: ProductFormProps) {
  const { handleSubmit, pending, error } = useFormAction(action, {
    successMessage,
  });
  const [categoryId, setCategoryId] = useState(
    defaultValues?.categoryId ?? NO_CATEGORY,
  );
  const [available, setAvailable] = useState(defaultValues?.available ?? true);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {defaultValues?.productId && (
        <input type="hidden" name="productId" value={defaultValues.productId} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información</CardTitle>
            <CardDescription>Lo que ve el cliente en la ficha del producto.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ej: Anillo solitario de oro"
                defaultValue={defaultValues?.name}
                aria-invalid={error ? true : undefined}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Descripción{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                maxLength={2000}
                placeholder="Medidas, terminación, cuidados..."
                defaultValue={defaultValues?.description ?? ""}
                aria-describedby="description-hint"
              />
              <p id="description-hint" className="text-xs text-muted-foreground">
                Hasta 2000 caracteres.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="price">Precio</Label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    $
                  </span>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    required
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    defaultValue={defaultValues?.price}
                    aria-describedby="price-hint"
                    className="pl-7 tabular-nums"
                  />
                </div>
                <p id="price-hint" className="text-xs text-muted-foreground">
                  En pesos argentinos.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material">
                  Material{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="material"
                  name="material"
                  type="text"
                  maxLength={120}
                  placeholder="Ej: Oro 18k, Plata 925"
                  defaultValue={defaultValues?.material ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organización</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="available">Visible en la tienda</Label>
                  <p className="text-xs text-muted-foreground">
                    {available
                      ? "Los clientes lo ven y pueden agregarlo al carrito."
                      : "Queda guardado, pero oculto para los clientes."}
                  </p>
                </div>
                <Switch
                  id="available"
                  name="available"
                  checked={available}
                  onCheckedChange={setAvailable}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category_id">Categoría</Label>
                <input
                  type="hidden"
                  name="category_id"
                  value={categoryId === NO_CATEGORY ? "" : categoryId}
                />
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category_id" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Todavía no tenés categorías.{" "}
                    <Link
                      href="/admin/categorias?nueva=1"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Crear una
                    </Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              {sizeStockSummary ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Stock por talle</span>
                    <StockBadge summary={sizeStockSummary} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este producto tiene talles: las cantidades se cargan en
                    cada talle, más abajo.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="stock">Unidades en stock</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    max={MAX_STOCK}
                    step={1}
                    placeholder="Ej: 3"
                    defaultValue={defaultValues?.stock ?? ""}
                    aria-describedby="stock-hint"
                    className="tabular-nums"
                  />
                  <p id="stock-hint" className="text-xs text-muted-foreground">
                    {defaultValues?.stock === null
                      ? "Todavía sin cargar: se vende como disponible hasta que ingreses la cantidad real. "
                      : "Con 0 se muestra \"Sin stock\" y no se puede agregar al carrito. "}
                    Si le agregás talles, el stock pasa a cargarse por talle.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enlace</CardTitle>
            </CardHeader>
            <CardContent>
              {showSlugField ? (
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    type="text"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    defaultValue={defaultValues?.slug}
                    aria-describedby="slug-hint"
                    className="font-mono text-sm"
                  />
                  <p id="slug-hint" className="text-xs text-muted-foreground">
                    Parte final de la URL del producto. Minúsculas, números y guiones.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  La URL del producto se genera automáticamente a partir del nombre.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/productos">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
