import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/business/getCurrentBusiness", () => ({ getCurrentBusiness: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getCurrentBusiness, type Business } from "@/lib/business/getCurrentBusiness";
import { createClient } from "@/lib/supabase/server";
import { deleteProduct, deleteProducts } from "./products";

const OWN_BUSINESS = "11111111-1111-4111-8111-111111111111";
const OTHER_BUSINESS = "22222222-2222-4222-8222-222222222222";

const OWN_A = "00000000-0000-4000-8000-00000000000a";
const OWN_B = "00000000-0000-4000-8000-00000000000b";
const FOREIGN = "00000000-0000-4000-8000-00000000000f";

type Row = { id: string; business_id: string; images: string[] };
type Filter = (row: Row) => boolean;

function imageUrl(path: string) {
  return `https://x.supabase.co/storage/v1/object/public/product-images/${path}`;
}

function createFakeSupabase(
  rows: Row[],
  options: { failDelete?: string[]; failSelect?: boolean } = {},
) {
  const removed: string[][] = [];

  function from(table: string) {
    if (table !== "product") throw new Error(`Tabla inesperada: ${table}`);

    const filters: Filter[] = [];
    let operation: "select" | "delete" = "select";

    async function run() {
      const matched = rows.filter((row) => filters.every((filter) => filter(row)));

      if (operation === "select") {
        if (options.failSelect) return { data: null, error: { message: "select" } };
        return {
          data: matched.map((row) => ({
            id: row.id,
            product_image: row.images.map((url) => ({ url })),
          })),
          error: null,
        };
      }

      if (matched.some((row) => options.failDelete?.includes(row.id))) {
        return { data: null, error: { message: "delete" } };
      }
      for (const row of matched) rows.splice(rows.indexOf(row), 1);
      return { data: matched.map((row) => ({ id: row.id })), error: null };
    }

    const builder = {
      select: () => builder,
      delete: () => {
        operation = "delete";
        return builder;
      },
      eq: (column: keyof Row, value: string) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: keyof Row, values: string[]) => {
        filters.push((row) => values.includes(row[column] as string));
        return builder;
      },
      returns: () => builder,
      maybeSingle: async () => {
        const { data, error } = await run();
        return { data: data?.[0] ?? null, error };
      },
      then: (
        resolve: (value: Awaited<ReturnType<typeof run>>) => unknown,
        reject: (reason: unknown) => unknown,
      ) => run().then(resolve, reject),
    };
    return builder;
  }

  const client = {
    from,
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { data: [], error: null };
        },
      }),
    },
  };

  return { client, removed };
}

function catalog(): Row[] {
  return [
    { id: OWN_A, business_id: OWN_BUSINESS, images: [imageUrl("own/a.jpg")] },
    { id: OWN_B, business_id: OWN_BUSINESS, images: [imageUrl("own/b.jpg")] },
    { id: FOREIGN, business_id: OTHER_BUSINESS, images: [imageUrl("other/f.jpg")] },
  ];
}

function useSupabase(fake: ReturnType<typeof createFakeSupabase>) {
  vi.mocked(createClient).mockResolvedValue(
    fake.client as unknown as Awaited<ReturnType<typeof createClient>>,
  );
}

function signInAs(businessId: string | null) {
  vi.mocked(getCurrentBusiness).mockResolvedValue(
    businessId ? ({ id: businessId } as Business) : null,
  );
}

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteProducts", () => {
  it("elimina los productos del negocio y sus imágenes", async () => {
    const rows = catalog();
    const fake = createFakeSupabase(rows);
    useSupabase(fake);
    signInAs(OWN_BUSINESS);

    const result = await deleteProducts([OWN_A, OWN_B]);

    expect(result).toEqual({ error: null, deletedIds: [OWN_A, OWN_B], failed: [] });
    expect(rows.map((row) => row.id)).toEqual([FOREIGN]);
    expect(fake.removed).toEqual([["own/a.jpg", "own/b.jpg"]]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/productos");
  });

  it("no borra productos de otro negocio aunque el cliente envíe su id", async () => {
    const rows = catalog();
    const fake = createFakeSupabase(rows);
    useSupabase(fake);
    signInAs(OWN_BUSINESS);

    const result = await deleteProducts([OWN_A, FOREIGN]);

    expect(result.deletedIds).toEqual([OWN_A]);
    expect(result.failed).toEqual([{ id: FOREIGN, reason: "not_found" }]);
    expect(rows.some((row) => row.id === FOREIGN)).toBe(true);
    expect(fake.removed.flat()).not.toContain("other/f.jpg");
  });

  it("con solo ids ajenos no borra nada ni revalida", async () => {
    const rows = catalog();
    useSupabase(createFakeSupabase(rows));
    signInAs(OTHER_BUSINESS);

    const result = await deleteProducts([OWN_A, OWN_B]);

    expect(result.deletedIds).toEqual([]);
    expect(result.failed).toHaveLength(2);
    expect(rows).toHaveLength(3);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("informa el fallo parcial con los ids que no se pudieron borrar", async () => {
    const rows = catalog();
    const fake = createFakeSupabase(rows, { failDelete: [OWN_B] });
    useSupabase(fake);
    signInAs(OWN_BUSINESS);

    const result = await deleteProducts([OWN_A, OWN_B]);

    expect(result).toEqual({
      error: null,
      deletedIds: [OWN_A],
      failed: [{ id: OWN_B, reason: "delete_failed" }],
    });
    expect(rows.map((row) => row.id)).toEqual([OWN_B, FOREIGN]);
    expect(fake.removed).toEqual([["own/a.jpg"]]);
  });

  it("sin sesión no toca la base", async () => {
    signInAs(null);

    const result = await deleteProducts([OWN_A]);

    expect(result.error).toMatch(/negocio/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rechaza ids inválidos antes de consultar", async () => {
    signInAs(OWN_BUSINESS);

    const result = await deleteProducts(["no-es-un-uuid"]);

    expect(result.error).toBe("Productos inválidos.");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("si falla la verificación no elimina nada", async () => {
    const rows = catalog();
    useSupabase(createFakeSupabase(rows, { failSelect: true }));
    signInAs(OWN_BUSINESS);

    const result = await deleteProducts([OWN_A]);

    expect(result.error).toMatch(/verificar/);
    expect(rows).toHaveLength(3);
  });
});

describe("deleteProduct", () => {
  it("sigue eliminando un producto propio con sus imágenes", async () => {
    const rows = catalog();
    const fake = createFakeSupabase(rows);
    useSupabase(fake);
    signInAs(OWN_BUSINESS);

    const result = await deleteProduct({ error: null }, formData({ productId: OWN_A }));

    expect(result).toEqual({ error: null });
    expect(rows.map((row) => row.id)).toEqual([OWN_B, FOREIGN]);
    expect(fake.removed).toEqual([["own/a.jpg"]]);
  });

  it("no elimina un producto de otro negocio", async () => {
    const rows = catalog();
    useSupabase(createFakeSupabase(rows));
    signInAs(OWN_BUSINESS);

    const result = await deleteProduct({ error: null }, formData({ productId: FOREIGN }));

    expect(result.error).toBe("El producto no existe o no te pertenece.");
    expect(rows).toHaveLength(3);
  });
});
