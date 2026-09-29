"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import {
  parseStockInput,
  resolveCartLineStatus,
  type CartLineFacts,
  type CartLineStatus,
} from "@/lib/stock/availability";

export type StockActionState = {
  error: string | null;
};

/** Prefijo de los campos de stock por talle: `size-stock:<sizeId>`. */
const SIZE_STOCK_PREFIX = "size-stock:";

/**
 * Ajuste rápido de inventario desde el listado. Actualiza el stock del
 * producto (si no tiene talles) o el de cada talle enviado. No descuenta
 * nada por pedidos: el dueño carga las cantidades al confirmar una venta.
 */
export async function updateInventory(
  _prevState: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const business = await getCurrentBusiness();

  if (!business) {
    return { error: "Necesitás configurar tu negocio antes de cargar stock." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return { error: "Producto inválido." };
  }

  const supabase = await createClient();

  const { data: product, error: fetchError } = await supabase
    .from("product")
    .select("id, product_size(id)")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (fetchError) {
    return { error: "No se pudo verificar el producto. Probá de nuevo." };
  }

  if (!product) {
    return { error: "El producto no existe o no te pertenece." };
  }

  const sizeIds = new Set(
    (product.product_size as { id: string }[]).map((size) => size.id),
  );

  if (sizeIds.size === 0) {
    const stock = parseStockInput(formData.get("stock"));
    if (!stock.ok) {
      return { error: stock.error };
    }

    const { error } = await supabase
      .from("product")
      .update({ stock: stock.value })
      .eq("id", productId)
      .eq("business_id", business.id);

    if (error) {
      return { error: "No se pudo guardar el stock. Probá de nuevo." };
    }
  } else {
    const updates: { id: string; stock: number }[] = [];

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith(SIZE_STOCK_PREFIX)) continue;

      const sizeId = key.slice(SIZE_STOCK_PREFIX.length);
      // Solo talles de ESTE producto: un id ajeno se rechaza entero.
      if (!sizeIds.has(sizeId)) {
        return { error: "Uno de los talles no pertenece a este producto." };
      }

      const stock = parseStockInput(value);
      if (!stock.ok) {
        return { error: stock.error };
      }
      updates.push({ id: sizeId, stock: stock.value });
    }

    if (updates.length === 0) {
      return { error: "No hay cantidades para guardar." };
    }

    const results = await Promise.all(
      updates.map(({ id, stock }) =>
        supabase
          .from("product_size")
          .update({ stock })
          .eq("id", id)
          .eq("product_id", productId),
      ),
    );

    if (results.some((result) => result.error)) {
      return { error: "No se pudo guardar el stock de algún talle. Probá de nuevo." };
    }
  }

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export type CartStockLine = {
  productId: string;
  sizeId: string | null;
  quantity: number;
};

export type CartStockResult =
  | {
      ok: true;
      statuses: { productId: string; sizeId: string | null; status: CartLineStatus }[];
    }
  | { ok: false };

type CartStockRow = {
  product_id: string;
  size_id: string | null;
  product_available: boolean;
  has_sizes: boolean;
  size_available: boolean | null;
  in_stock: boolean;
  covers_quantity: boolean;
};

const MAX_CART_LINES = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Revalida el carrito guardado contra el stock actual. Pública (la usan
 * visitantes sin sesión): la función SQL solo devuelve booleanos, así que
 * nunca expone cantidades. No reserva unidades.
 */
export async function checkCartStock(
  lines: CartStockLine[],
): Promise<CartStockResult> {
  // El carrito sale de localStorage: se sanea antes de mandarlo a la base.
  const cleanLines = (Array.isArray(lines) ? lines : [])
    .filter(
      (line) =>
        typeof line?.productId === "string" &&
        UUID_PATTERN.test(line.productId) &&
        (line.sizeId === null ||
          (typeof line.sizeId === "string" && UUID_PATTERN.test(line.sizeId))),
    )
    .slice(0, MAX_CART_LINES)
    .map((line) => ({
      product_id: line.productId,
      size_id: line.sizeId,
      quantity: Number.isInteger(line.quantity) ? Math.max(1, line.quantity) : 1,
    }));

  if (cleanLines.length === 0) {
    return { ok: true, statuses: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cart_stock_status", {
    lines: cleanLines,
  });

  if (error || !Array.isArray(data)) {
    return { ok: false };
  }

  // Sin tipos generados de Supabase, rpc() devuelve any.
  const rows = data as CartStockRow[];
  const factsByLine = new Map<string, CartLineFacts>(
    rows.map((row) => [
      `${row.product_id}:${row.size_id ?? ""}`,
      {
        productAvailable: row.product_available,
        hasSizes: row.has_sizes,
        sizeAvailable: row.size_available,
        inStock: row.in_stock,
        coversQuantity: row.covers_quantity,
      },
    ]),
  );

  return {
    ok: true,
    statuses: cleanLines.map((line) => ({
      productId: line.product_id,
      sizeId: line.size_id,
      status: resolveCartLineStatus(
        line.size_id,
        factsByLine.get(`${line.product_id}:${line.size_id ?? ""}`),
      ),
    })),
  };
}
