import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El proxy ya protege esta ruta; esta verificación es una capa
  // adicional por si la página se renderiza fuera de ese matcher.
  if (!user) {
    redirect("/admin/login");
  }

  const business = await getCurrentBusiness();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sesión iniciada como <strong>{user.email}</strong>.
      </p>

      {business ? (
        <div className="text-center">
          <p>
            Negocio: <strong>{business.name}</strong>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            WhatsApp: {business.whatsapp_number}
          </p>
        </div>
      ) : (
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Todavía no configuraste tu negocio.
          </p>
          <Link
            href="/admin/configuracion"
            className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Configurar negocio
          </Link>
        </div>
      )}

      <LogoutButton />
    </main>
  );
}
