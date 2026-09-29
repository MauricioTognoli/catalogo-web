"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleProductSizeAvailability } from "@/actions/productSizes";
import { Switch } from "@/components/ui/switch";

export function SizeAvailabilitySwitch({
  productId,
  sizeId,
  sizeLabel,
  available,
}: {
  productId: string;
  sizeId: string;
  sizeLabel: string;
  available: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(available);

  function handleChange(next: boolean) {
    startTransition(async () => {
      setOptimisticAvailable(next);

      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("sizeId", sizeId);
      formData.append("available", String(next));

      const result = await toggleProductSizeAvailability({ error: null }, formData);

      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Switch
      checked={optimisticAvailable}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={`Talle ${sizeLabel} activo`}
    />
  );
}
