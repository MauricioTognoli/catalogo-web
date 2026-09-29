"use client";

import { useState } from "react";
import {
  LIMITS,
  collectionHiddenReason,
  type CollectionBlock,
} from "@/lib/storefront/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CtaFields, type LinkOptions } from "./cta-fields";
import { ImageSlotField } from "./image-slot-field";
import { SectionCard } from "./section-card";
import { isDirty, useSaveSection } from "./use-save-section";

export function CollectionEditor({
  index,
  block,
  imageUrl,
  options,
}: {
  index: 0 | 1;
  block: CollectionBlock;
  imageUrl: string | null;
  options: LinkOptions;
}) {
  const saved = { eyebrow: block.eyebrow, title: block.title, cta: block.cta };
  const [form, setForm] = useState(saved);
  const { save, pending } = useSaveSection();
  const prefix = `collection-${index}`;

  return (
    <SectionCard
      title={`Colección ${index + 1}`}
      description="Bloque con imagen y texto que lleva a una categoría, un producto o una sección."
      hiddenReason={collectionHiddenReason({ ...block, ...form })}
      dirty={isDirty(form, saved)}
      pending={pending}
      onSave={() => save({ section: "collection", index, ...form })}
    >
      <ImageSlotField
        slot={index === 0 ? "collection-0" : "collection-1"}
        imageUrl={imageUrl}
        label="Imagen"
        hint="Vertical, idealmente 800 × 1000 px."
        aspectClassName="aspect-[4/5] max-w-56"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-eyebrow`}>Bajada</Label>
          <Input
            id={`${prefix}-eyebrow`}
            value={form.eyebrow}
            maxLength={LIMITS.eyebrow}
            placeholder="Ej: Nueva colección"
            onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-title`}>Título</Label>
          <Input
            id={`${prefix}-title`}
            value={form.title}
            maxLength={LIMITS.title}
            placeholder="Ej: Colección Cumpleaños"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
      </div>

      <CtaFields
        value={form.cta}
        options={options}
        onChange={(cta) => setForm({ ...form, cta })}
      />
    </SectionCard>
  );
}
