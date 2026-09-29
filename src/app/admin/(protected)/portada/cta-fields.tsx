"use client";

import { useId } from "react";
import { TriangleAlert } from "lucide-react";
import {
  LIMITS,
  PAGE_TARGETS,
  type Cta,
  type LinkTarget,
  type PageKey,
} from "@/lib/storefront/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LinkOptions = {
  categories: { id: string; name: string }[];
  products: { id: string; name: string; available: boolean }[];
};

const NO_TARGET = "none";

function encodeTarget(target: LinkTarget | null): string {
  if (!target) return NO_TARGET;
  return target.type === "page" ? `page:${target.page}` : `${target.type}:${target.id}`;
}

function decodeTarget(value: string): LinkTarget | null {
  const [type, key] = value.split(":");
  if (type === "page") return { type: "page", page: key as PageKey };
  if (type === "category" || type === "product") return { type, id: key };
  return null;
}

/**
 * Texto y destino de un botón. El destino se elige de una lista cerrada
 * (categorías, productos y páginas existentes): no hay campo de URL libre,
 * así que no se pueden cargar enlaces rotos.
 */
export function CtaFields({
  value,
  onChange,
  options,
}: {
  value: Cta;
  onChange: (value: Cta) => void;
  options: LinkOptions;
}) {
  const id = useId();
  const target = value.target;

  const warning = (() => {
    if (!target) return null;
    if (target.type === "category" && !options.categories.some((c) => c.id === target.id)) {
      return "La categoría elegida ya no existe: el botón no se va a mostrar.";
    }
    if (target.type === "product") {
      const product = options.products.find((p) => p.id === target.id);
      if (!product) return "El producto elegido ya no existe: el botón no se va a mostrar.";
      if (!product.available) {
        return "El producto está oculto: el botón no se muestra hasta que lo hagas visible.";
      }
    }
    if (target.type === "page" && target.page === "destacados") {
      return "Solo se muestra si hay productos destacados visibles.";
    }
    return null;
  })();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-target`}>Destino del botón</Label>
        <Select
          value={encodeTarget(target)}
          onValueChange={(next) => onChange({ ...value, target: decodeTarget(next) })}
        >
          <SelectTrigger id={`${id}-target`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TARGET}>Sin botón</SelectItem>
            <SelectGroup>
              <SelectLabel>Páginas</SelectLabel>
              {(Object.keys(PAGE_TARGETS) as PageKey[]).map((page) => (
                <SelectItem key={page} value={`page:${page}`}>
                  {PAGE_TARGETS[page].label}
                </SelectItem>
              ))}
            </SelectGroup>
            {options.categories.length > 0 && (
              <SelectGroup>
                <SelectLabel>Categorías</SelectLabel>
                {options.categories.map((category) => (
                  <SelectItem key={category.id} value={`category:${category.id}`}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {options.products.length > 0 && (
              <SelectGroup>
                <SelectLabel>Productos</SelectLabel>
                {options.products.map((product) => (
                  <SelectItem key={product.id} value={`product:${product.id}`}>
                    {product.name}
                    {!product.available && " (oculto)"}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-label`}>Texto del botón</Label>
        <Input
          id={`${id}-label`}
          value={value.label}
          maxLength={LIMITS.ctaLabel}
          disabled={!target}
          required={target !== null}
          placeholder="Ej: Ver colección"
          onChange={(event) => onChange({ ...value, label: event.target.value })}
        />
      </div>

      {warning && (
        <p className="flex items-start gap-2 text-xs text-warning sm:col-span-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      )}
    </div>
  );
}
