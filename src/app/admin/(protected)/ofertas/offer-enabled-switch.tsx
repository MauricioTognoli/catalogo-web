"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setOfferEnabled } from "@/actions/offers";
import { Switch } from "@/components/ui/switch";

export function OfferEnabledSwitch({
  offerId,
  productName,
  enabled,
  ended,
}: {
  offerId: string;
  productName: string;
  enabled: boolean;
  /** Una oferta vencida no se puede reactivar sin cambiar sus fechas. */
  ended: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);

  function handleChange(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const formData = new FormData();
      formData.append("offerId", offerId);
      formData.append("enabled", String(next));
      const result = await setOfferEnabled({ error: null }, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Oferta activada" : "Oferta desactivada");
    });
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleChange}
      disabled={pending || (ended && !optimistic)}
      aria-label={
        optimistic
          ? `Desactivar la oferta de ${productName}`
          : `Activar la oferta de ${productName}`
      }
    />
  );
}
