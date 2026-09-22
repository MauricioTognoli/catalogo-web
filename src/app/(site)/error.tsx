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
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Hubo un problema al cargar esta página. Podés intentar de nuevo o
        volver al catálogo.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:focus-visible:outline-zinc-100"
        >
          Volver al catálogo
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Código de referencia: {error.digest}
        </p>
      )}
    </div>
  );
}
