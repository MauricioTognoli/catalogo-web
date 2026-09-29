import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Sale de la vista previa y vuelve al editor de la portada. */
export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  return NextResponse.redirect(new URL("/admin/portada", request.url));
}
