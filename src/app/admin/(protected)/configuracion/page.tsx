import Link from "next/link";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { CreateBusinessForm } from "./create-business-form";
import { EditBusinessForm } from "./edit-business-form";
import { BusinessLogo } from "./business-logo";

export default async function ConfiguracionPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-2xl font-semibold">Configuración del negocio</h1>
        <CreateBusinessForm />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Configuración del negocio</h1>
        <Link
          href="/admin/dashboard"
          className="text-sm text-zinc-500 hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Información básica</h2>
        <EditBusinessForm business={business} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Logo</h2>
        <BusinessLogo logoUrl={business.logo_url} />
      </section>
    </main>
  );
}
