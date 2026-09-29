import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

/** Estado para secciones que necesitan un negocio configurado. */
export function BusinessRequired({ description }: { description: string }) {
  return (
    <EmptyState
      icon={Store}
      title="Configurá tu negocio para empezar"
      description={description}
      action={
        <Button asChild>
          <Link href="/admin/configuracion">Configurar negocio</Link>
        </Button>
      }
    />
  );
}
