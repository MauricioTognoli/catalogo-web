import { Badge } from "@/components/ui/badge";
import type { OfferStatus } from "@/lib/offers/pricing";
import { cn } from "@/lib/utils/cn";

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  active: "Activa",
  scheduled: "Programada",
  disabled: "Desactivada",
  ended: "Finalizada",
};

const STATUS_CLASSES: Record<OfferStatus, string> = {
  active: "border-success/40 bg-success/10 text-success",
  scheduled: "border-primary/20 text-foreground",
  disabled: "text-muted-foreground",
  ended: "text-muted-foreground line-through decoration-muted-foreground/50",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASSES[status])}>
      {status === "active" && (
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
      )}
      {OFFER_STATUS_LABELS[status]}
    </Badge>
  );
}
