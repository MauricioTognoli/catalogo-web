"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="No pudimos cargar esta sección"
      description="Puede ser un problema de conexión. Probá de nuevo en unos segundos."
      action={<Button onClick={reset}>Reintentar</Button>}
    />
  );
}
