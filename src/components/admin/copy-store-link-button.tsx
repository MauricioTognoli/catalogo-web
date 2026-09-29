"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia la URL pública de la tienda para compartirla (redes, WhatsApp). */
export function CopyStoreLinkButton(
  props: Omit<React.ComponentProps<typeof Button>, "onClick">,
) {
  async function handleCopy() {
    const url = `${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de la tienda copiado", { description: url });
    } catch {
      toast.error("No se pudo copiar el enlace", { description: url });
    }
  }

  return (
    <Button type="button" onClick={handleCopy} {...props}>
      <Link2 aria-hidden="true" />
      {props.children ?? "Copiar enlace de la tienda"}
    </Button>
  );
}
