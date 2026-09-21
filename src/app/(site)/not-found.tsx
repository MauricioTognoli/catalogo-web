import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No encontrado</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        No pudimos encontrar lo que buscabas.
      </p>
      <Link
        href="/"
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
