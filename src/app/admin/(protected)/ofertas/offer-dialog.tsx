"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { saveOffer } from "@/actions/offers";
import { discountPercent } from "@/lib/offers/pricing";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { OfferView, ProductOption } from "./types";

/**
 * Alta y edición de una oferta. Las fechas se cargan en la hora de la
 * tienda (Argentina); el servidor las convierte, sin depender de la zona
 * del navegador.
 */
export function OfferDialog({
  open,
  onOpenChange,
  offer,
  products,
  defaultStartsAt,
  defaultEndsAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: OfferView;
  products: ProductOption[];
  defaultStartsAt: string;
  defaultEndsAt: string;
}) {
  const isEdit = offer !== undefined;
  const [productId, setProductId] = useState(offer?.productId ?? "");
  const [price, setPrice] = useState(offer ? String(offer.offerPrice) : "");
  const [startsAt, setStartsAt] = useState(offer?.startsAtLocal ?? defaultStartsAt);
  const [endsAt, setEndsAt] = useState(offer?.endsAtLocal ?? defaultEndsAt);

  const { handleSubmit, pending, error } = useFormAction(saveOffer, {
    successMessage: isEdit ? "Oferta actualizada" : "Oferta creada",
    onSuccess: () => onOpenChange(false),
  });

  const product = products.find((item) => item.id === productId);
  const numericPrice = Number(price);
  const priceHint = (() => {
    if (!product) return null;
    if (price === "" || !Number.isFinite(numericPrice)) {
      return `Precio normal: ${formatPrice(product.price)}`;
    }
    if (numericPrice >= product.price) {
      return `Tiene que ser menor al precio normal (${formatPrice(product.price)}).`;
    }
    return `Precio normal ${formatPrice(product.price)} · ${discountPercent(product.price, numericPrice)}% de descuento`;
  })();
  const priceTooHigh =
    product !== undefined && price !== "" && numericPrice >= product.price;
  // Comparación de texto válida: mismo formato ISO local.
  const rangeInvalid = startsAt !== "" && endsAt !== "" && endsAt <= startsAt;

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar oferta" : "Nueva oferta"}</DialogTitle>
            <DialogDescription>
              Fechas y horas en hora de Argentina. La tienda aplica y quita el
              precio promocional sola, sin volver a publicar.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="offerId" value={offer.id} />}

          <div className="grid gap-2">
            <Label htmlFor="offer-product">Producto</Label>
            <input type="hidden" name="productId" value={productId} />
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="offer-product" className="w-full">
                <SelectValue placeholder="Elegí un producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {formatPrice(item.price)}
                    {!item.available && " (oculto)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {product && !product.available && (
              <p className="flex items-start gap-1.5 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                El producto está oculto: la oferta no se ve hasta que lo muestres.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="offer-price">Precio promocional</Label>
            <div className="relative">
              <span
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                id="offer-price"
                name="offerPrice"
                type="number"
                inputMode="decimal"
                required
                min={0.01}
                max={product ? Math.max(0.01, product.price - 0.01) : undefined}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                aria-invalid={priceTooHigh ? true : undefined}
                aria-describedby="offer-price-hint"
                className="pl-7 tabular-nums"
              />
            </div>
            {priceHint && (
              <p
                id="offer-price-hint"
                className={priceTooHigh ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {priceHint}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="offer-starts">Empieza</Label>
              <Input
                id="offer-starts"
                name="startsAt"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-ends">Termina</Label>
              <Input
                id="offer-ends"
                name="endsAt"
                type="datetime-local"
                required
                min={startsAt || undefined}
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                aria-invalid={rangeInvalid ? true : undefined}
                aria-describedby="offer-range-hint"
              />
            </div>
            <p
              id="offer-range-hint"
              className={
                rangeInvalid
                  ? "text-xs text-destructive sm:col-span-2"
                  : "text-xs text-muted-foreground sm:col-span-2"
              }
            >
              {rangeInvalid
                ? "La fecha de fin tiene que ser posterior al inicio."
                : "Dura entre 15 minutos y 90 días. Termina exactamente a la hora indicada."}
            </p>
          </div>

          <div className="grid gap-4 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="offer-featured">Destacar en el banner promocional</Label>
                <p className="text-xs text-muted-foreground">
                  Mientras esté activa reemplaza al banner de la portada, con
                  contador. Una sola destacada a la vez.
                </p>
              </div>
              <Switch
                id="offer-featured"
                name="featured"
                defaultChecked={offer?.featured ?? false}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="offer-enabled">Habilitada</Label>
                <p className="text-xs text-muted-foreground">
                  Desactivada, se guarda pero no se aplica.
                </p>
              </div>
              <Switch
                id="offer-enabled"
                name="enabled"
                defaultChecked={offer?.enabled ?? true}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || !productId || priceTooHigh || rangeInvalid}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear oferta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
