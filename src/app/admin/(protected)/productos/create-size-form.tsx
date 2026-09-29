"use client";

import { Loader2, Plus } from "lucide-react";
import { createProductSize } from "@/actions/productSizes";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateSizeForm({ productId }: { productId: string }) {
  const { handleSubmit, pending } = useFormAction(createProductSize, {
    successMessage: "Talle agregado",
    onSuccess: (form) => {
      form.reset();
      form.querySelector<HTMLInputElement>("input[name=label]")?.focus();
    },
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="productId" value={productId} />
      {/* Los talles nuevos nacen disponibles; se cambian desde la lista. */}
      <input type="hidden" name="available" value="on" />

      <div className="grid flex-1 gap-2">
        <Label htmlFor="new-size-label">Nuevo talle</Label>
        <Input
          id="new-size-label"
          name="label"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="Ej: 14, 16, 45 cm, Único"
        />
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        Agregar
      </Button>
    </form>
  );
}
