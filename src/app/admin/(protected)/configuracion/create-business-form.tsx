"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createBusiness } from "@/actions/business";
import { slugify } from "@/lib/utils/slugify";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateBusinessForm() {
  // La acción redirige al dashboard al terminar: sin toast de éxito.
  const { handleSubmit, pending, error } = useFormAction(createBusiness);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre de la joyería</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            // Sugerimos el slug a partir del nombre hasta que lo editen a mano.
            if (!slugEdited) setSlug(slugify(event.target.value));
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Identificador</Label>
        <Input
          id="slug"
          name="slug"
          type="text"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="mi-joyeria"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          aria-describedby="slug-hint"
          className="font-mono text-sm"
        />
        <p id="slug-hint" className="text-xs text-muted-foreground">
          Minúsculas, números y guiones.
        </p>
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
          placeholder="5491122334455"
          aria-describedby="whatsapp-hint"
          className="tabular-nums"
        />
        <p id="whatsapp-hint" className="text-xs text-muted-foreground">
          Solo números, con código de país y de área. A este número llegan los
          pedidos del carrito.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {pending ? "Creando..." : "Crear negocio"}
      </Button>
    </form>
  );
}
