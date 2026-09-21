import Link from "next/link";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { CreateBusinessForm } from "./create-business-form";

export default async function ConfiguracionPage() {
  const business = await getCurrentBusiness();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Configuración del negocio</h1>

      {business ? (
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Ya tenés un negocio configurado: <strong>{business.name}</strong>.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Volver al dashboard
          </Link>
        </div>
      ) : (
        <CreateBusinessForm />
      )}
    </main>
  );
}
