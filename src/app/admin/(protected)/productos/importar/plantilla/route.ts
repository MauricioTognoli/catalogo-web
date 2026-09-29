import { NextResponse, type NextRequest } from "next/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_FILE_NAME, XLSX_MIME_TYPE, buildTemplate } from "@/lib/import/xlsx";

/** Plantilla .xlsx con las categorías del negocio de la sesión. */
export async function GET(request: NextRequest) {
  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.redirect(new URL("/admin/configuracion", request.url));
  }

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("category")
    .select("name")
    .eq("business_id", business.id)
    .order("position", { ascending: true })
    .limit(1000);

  if (error) {
    return new NextResponse("No se pudo generar la plantilla.", { status: 500 });
  }

  const bytes = buildTemplate(categories.map((category) => category.name));

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": XLSX_MIME_TYPE,
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILE_NAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
