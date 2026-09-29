import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { CopyStoreLinkButton } from "@/components/admin/copy-store-link-button";
import { CreateBusinessForm } from "./create-business-form";
import { EditBusinessForm } from "./edit-business-form";
import { BusinessLogo } from "./business-logo";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function ConfiguracionPage() {
  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <div className="mx-auto w-full max-w-md py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Configurá tu negocio</CardTitle>
            <CardDescription>
              Con estos datos ya podés empezar a cargar productos. El resto
              (logo, redes, dirección) lo completás después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBusinessForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos de contacto e identidad de tu tienda."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EditBusinessForm business={business} />
        </div>

        <div className="flex flex-col gap-6">
          <BusinessLogo logoUrl={business.logo_url} />

          <Card>
            <CardHeader>
              <CardTitle>Tu tienda</CardTitle>
              <CardDescription>
                Compartí el enlace en redes o por WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <CopyStoreLinkButton variant="outline" className="justify-start" />
              <Button asChild variant="outline" className="justify-start">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Abrir la tienda
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
