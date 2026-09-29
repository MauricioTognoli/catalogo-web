"use client";

import { Loader2 } from "lucide-react";
import { updateBusiness } from "@/actions/business";
import type { Business } from "@/lib/business/getCurrentBusiness";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Optional() {
  return <span className="font-normal text-muted-foreground">(opcional)</span>;
}

export function EditBusinessForm({ business }: { business: Business }) {
  const { handleSubmit, pending, error } = useFormAction(updateBusiness, {
    successMessage: "Cambios guardados",
  });

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
          <CardDescription>
            Se muestran en la tienda. El WhatsApp recibe los pedidos del carrito.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              defaultValue={business.name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="whatsapp_number">WhatsApp para pedidos</Label>
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              type="tel"
              inputMode="numeric"
              required
              pattern="\d{6,15}"
              defaultValue={business.whatsapp_number}
              aria-describedby="whatsapp-hint"
              className="tabular-nums"
            />
            <p id="whatsapp-hint" className="text-xs text-muted-foreground">
              Solo números, con código de país. Ej: 5491122334455
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">
              Email <Optional />
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={business.email ?? ""}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instagram_url">
              Instagram <Optional />
            </Label>
            <Input
              id="instagram_url"
              name="instagram_url"
              type="url"
              placeholder="https://instagram.com/tu-joyeria"
              defaultValue={business.instagram_url ?? ""}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address">
              Dirección <Optional />
            </Label>
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="Calle, número, ciudad"
              defaultValue={business.address ?? ""}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
