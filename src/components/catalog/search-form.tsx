import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function SearchForm({ className }: { className?: string }) {
  return (
    <form
      action="/buscar"
      method="GET"
      role="search"
      className={cn("w-full", className)}
    >
      <label htmlFor="q" className="sr-only">
        Buscar productos
      </label>
      <div className="relative">
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="¿Qué estás buscando? ej: anillo"
          className="pr-11"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
