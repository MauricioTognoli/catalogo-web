"use client";

import Link from "next/link";

/**
 * Error boundary del segmento público. Envuelve las páginas de `(site)`
 * (home, categoría, producto) y sus layouts anidados — pero NO envuelve
 * a `(site)/layout.tsx` en sí (es su hermano, no su padre), que es
 * justamente donde se resuelve `getPublicBusiness()`. Es la semántica
 * documentada de Next.js para `error.js`, no un descuido: el error 500
 * conocido de Supabase ("permission denied for table business") ocurre
 * en ese layout, así que este archivo no lo intercepta. Ver el resumen
 * de esta etapa para el detalle completo de esa decisión.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-serif text-3xl text-zinc-900">Algo salió mal</h1>
      <p className="text-zinc-600">
        Hubo un problema al cargar esta página. Podés intentar de nuevo o
        volver al catálogo.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-full border border-brand px-6 py-2.5 text-sm font-medium text-brand hover:bg-brand hover:text-brand-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Volver al catálogo
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-zinc-400">
          Código de referencia: {error.digest}
        </p>
      )}
    </div>
  );
}
