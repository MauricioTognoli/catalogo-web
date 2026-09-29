import { Badge } from "@/components/ui/badge";
import type { StockSummary } from "@/lib/stock/availability";
import { cn } from "@/lib/utils/cn";

/** Estado de stock para el panel (el admin sí ve cantidades). */
export function StockBadge({
  summary,
  className,
}: {
  summary: StockSummary;
  className?: string;
}) {
  switch (summary.state) {
    case "out":
      return (
        <Badge
          variant="outline"
          className={cn("border-destructive/40 text-destructive", className)}
        >
          Sin stock
        </Badge>
      );
    case "untracked":
      return (
        <Badge variant="outline" className={cn("text-muted-foreground", className)}>
          Sin cargar
        </Badge>
      );
    case "low":
      return (
        <Badge
          variant="outline"
          className={cn("border-warning/50 text-warning tabular-nums", className)}
        >
          {summary.units} u. · bajo
        </Badge>
      );
    case "ok":
      return (
        <Badge variant="secondary" className={cn("tabular-nums", className)}>
          {summary.units} u.
        </Badge>
      );
  }
}
