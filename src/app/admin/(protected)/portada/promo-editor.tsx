"use client";

import { useState } from "react";
import { LIMITS, promoHiddenReason, type PromoSection } from "@/lib/storefront/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CtaFields, type LinkOptions } from "./cta-fields";
import { ImageSlotField } from "./image-slot-field";
import { SectionCard } from "./section-card";
import { isDirty, useSaveSection } from "./use-save-section";

export function PromoEditor({
  promo,
  announcement,
  imageUrl,
  options,
}: {
  promo: PromoSection;
  announcement: string;
  imageUrl: string | null;
  options: LinkOptions;
}) {
  const saved = {
    announcement,
    enabled: promo.enabled,
    eyebrow: promo.eyebrow,
    title: promo.title,
    description: promo.description,
    cta: promo.cta,
  };
  const [form, setForm] = useState(saved);
  const { save, pending } = useSaveSection();

  return (
    <SectionCard
      title="Promoción"
      description="La barra de anuncios de arriba de todo y el banner promocional principal."
      hiddenReason={promoHiddenReason({ ...promo, ...form })}
      dirty={isDirty(form, saved)}
      pending={pending}
      onSave={() => save({ section: "promo", ...form })}
    >
      <div className="grid gap-2">
        <Label htmlFor="promo-announcement">Barra de anuncios</Label>
        <Input
          id="promo-announcement"
          value={form.announcement}
          maxLength={LIMITS.announcement}
          placeholder="Ej: Envíos a todo el país · 3 cuotas sin interés"
          aria-describedby="promo-announcement-hint"
          onChange={(event) => setForm({ ...form, announcement: event.target.value })}
        />
        <p id="promo-announcement-hint" className="text-xs text-muted-foreground">
          Vacía, la barra no se muestra.
        </p>
      </div>

      <Separator />

      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor="promo-enabled">Mostrar banner promocional</Label>
          <p className="text-xs text-muted-foreground">
            Aparece después de los productos destacados.
          </p>
        </div>
        <Switch
          id="promo-enabled"
          checked={form.enabled}
          onCheckedChange={(enabled) => setForm({ ...form, enabled })}
        />
      </div>

      <ImageSlotField
        slot="promo"
        imageUrl={imageUrl}
        label="Imagen del banner"
        hint="Opcional. Vertical, idealmente 800 × 1000 px."
        aspectClassName="aspect-[4/5] max-w-56"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="promo-eyebrow">Bajada</Label>
          <Input
            id="promo-eyebrow"
            value={form.eyebrow}
            maxLength={LIMITS.eyebrow}
            placeholder="Ej: Hasta 30% off"
            onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="promo-title">Título</Label>
          <Input
            id="promo-title"
            value={form.title}
            maxLength={LIMITS.title}
            required={form.enabled}
            placeholder="Ej: Pulseras de oro 18k"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="promo-description">Descripción</Label>
        <Textarea
          id="promo-description"
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
