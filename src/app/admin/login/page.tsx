import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/catalog/business";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BusinessMark } from "@/components/admin/business-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage() {
  // Sin negocio todavía (primera instalación) el login funciona igual,
  // solo que sin nombre ni logo.
  const business = await getPublicBusiness();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BusinessMark
            name={business?.name ?? null}
            logoUrl={business?.logo_url ?? null}
            className="size-12 rounded-xl text-lg"
          />
          {business && (
            <p className="text-sm font-medium text-muted-foreground">
              {business.name}
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresá al panel para administrar tu catálogo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Acceso exclusivo para administradores de la tienda.
        </p>
      </div>
    </main>
  );
}
