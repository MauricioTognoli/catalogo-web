import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-serif text-3xl text-zinc-900">No encontrado</h1>
      <p className="text-zinc-600">No pudimos encontrar lo que buscabas.</p>
      <Link
        href="/"
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
