import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";

/**
 * Activa la vista previa de la portada y abre la tienda. La cookie de
 * draftMode por sí sola no expone nada: la tienda lee el borrador con la
 * sesión del usuario, y la RLS solo se lo entrega al dueño.
 */
export async function GET(request: NextRequest) {
  // El proxy ya exige sesión en /admin/*; además tiene que tener negocio.
  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.redirect(new URL("/admin/configuracion", request.url));
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL("/", request.url));
}
