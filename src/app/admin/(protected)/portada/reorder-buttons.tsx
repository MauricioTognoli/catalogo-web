"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mueve un elemento de una lista. Devuelve una lista nueva. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * Ordenamiento accesible con botones (teclado y lectores de pantalla), en
 * lugar de depender solo de arrastrar.
 */
export function ReorderButtons({
  itemLabel,
  index,
  count,
  onMove,
  disabled = false,
}: {
  itemLabel: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        aria-label={`Subir ${itemLabel} (posición ${index + 1} de ${count})`}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Bajar ${itemLabel} (posición ${index + 1} de ${count})`}
      >
        <ChevronDown />
      </Button>
    </div>
  );
}
