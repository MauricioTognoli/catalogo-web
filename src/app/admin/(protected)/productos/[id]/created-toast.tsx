"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

/**
 * Confirma el alta que llegó por redirect (?creado=1) y limpia el
 * parámetro, para que recargar la página no repita el aviso.
 */
export function CreatedToast() {
  const pathname = usePathname();

  useEffect(() => {
    // `id` evita el aviso duplicado cuando StrictMode corre el efecto dos veces.
    toast.success("Producto creado", {
      id: "product-created",
      description: "Ahora sumale fotos y, si corresponde, talles.",
    });
    window.history.replaceState(null, "", pathname);
  }, [pathname]);

  return null;
}
