"use client";

import { useState } from "react";
import { LIMITS, type HeroSection } from "@/lib/storefront/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CtaFields, type LinkOptions } from "./cta-fields";
import { ImageSlotField } from "./image-slot-field";
import { SectionCard } from "./section-card";
import { isDirty, useSaveSection } from "./use-save-section";

export function HeroEditor({
  hero,
  imageUrl,
  businessName,
  options,
}: {
  hero: HeroSection;
  imageUrl: string | null;
  businessName: string;
  options: LinkOptions;
}) {
  const saved = {
    eyebrow: hero.eyebrow,
    title: hero.title,
    description: hero.description,
    cta: hero.cta,
  };
  const [form, setForm] = useState(saved);
  const { save, pending } = useSaveSection();

  return (
    <SectionCard
      title="Portada principal"
      description="La imagen grande con el título y el botón que se ven al entrar a la tienda."
      dirty={isDirty(form, saved)}
      pending={pending}
      onSave={() => save({ section: "hero", ...form })}
    >
      <ImageSlotField
        slot="hero"
        imageUrl={imageUrl}
        label="Imagen principal"
        hint="Horizontal, idealmente 1600 × 900 px. Sin imagen se usa la foto del producto más reciente."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="hero-eyebrow">Bajada</Label>
          <Input
            id="hero-eyebrow"
            value={form.eyebrow}
            maxLength={LIMITS.eyebrow}
            placeholder="Ej: Nueva colección"
            onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hero-title">Título</Label>
          <Input
            id="hero-title"
            value={form.title}
            maxLength={LIMITS.title}
            placeholder={businessName}
            aria-describedby="hero-title-hint"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <p id="hero-title-hint" className="text-xs text-muted-foreground">
            Vacío: se muestra el nombre del negocio.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hero-description">Descripción</Label>
        <Textarea
          id="hero-description"
          value={form.description}
          maxLength={LIMITS.description}
          rows={3}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>

      <CtaFields
        value={form.cta}
        options={options}
        onChange={(cta) => setForm({ ...form, cta })}
      />
    </SectionCard>
  );
}
