"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveStorefrontSection } from "@/actions/storefront";
import type { SectionInput } from "@/lib/storefront/config";

/** Guarda una sección en el borrador y avisa el resultado. */
export function useSaveSection() {
  const [pending, startTransition] = useTransition();

  function save(input: SectionInput, onSaved?: () => void) {
    startTransition(async () => {
      const result = await saveStorefrontSection(input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Guardado en el borrador", {
        description: "Publicá la portada para que lo vean tus clientes.",
      });
      onSaved?.();
    });
  }

  return { save, pending };
}

/** ¿El estado local difiere de lo guardado? (para habilitar "Guardar") */
export function isDirty(local: unknown, saved: unknown): boolean {
  return JSON.stringify(local) !== JSON.stringify(saved);
}
