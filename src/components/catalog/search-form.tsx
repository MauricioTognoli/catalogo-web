import Form from "next/form";
import { Search } from "lucide-react";
import { Input } from "@/components/catalog/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * El layout dibuja dos buscadores (escritorio y móvil); cada uno necesita
 * su propio `inputId` para que el <label> apunte al campo correcto.
 */
export function SearchForm({
  className,
  inputId = "q",
}: {
  className?: string;
  inputId?: string;
}) {
  return (
    <Form
      action="/buscar"
      role="search"
      className={cn("w-full", className)}
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar productos
      </label>
      <div className="relative">
        <Input
          id={inputId}
          name="q"
          type="search"
          placeholder="¿Qué estás buscando hoy? ej: anillo"
          className="rounded-md border-transparent bg-cream pr-11"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-600 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Form>
  );
}
