"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleProductAvailability } from "@/actions/products";
import { Switch } from "@/components/ui/switch";

export function ProductAvailabilitySwitch({
  productId,
  productName,
  available,
}: {
  productId: string;
  productName: string;
  available: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Se muestra el nuevo estado al instante; si el servidor falla, vuelve
  // solo al valor real cuando termina la transición.
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(available);

  function handleChange(next: boolean) {
    startTransition(async () => {
      setOptimisticAvailable(next);

      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("available", String(next));

      const result = await toggleProductAvailability({ error: null }, formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        next
          ? `"${productName}" ahora se muestra en la tienda`
          : `"${productName}" quedó oculto`,
      );
    });
  }

  return (
    <Switch
      checked={optimisticAvailable}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={
        optimisticAvailable
          ? `Ocultar ${productName} de la tienda`
          : `Mostrar ${productName} en la tienda`
      }
    />
  );
}
