import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/business/getCurrentBusiness", () => ({
  getCurrentBusiness: vi.fn(async () => ({ id: "biz-1" })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toggleProductAvailability } from "@/actions/products";
import { setOfferEnabled } from "@/actions/offers";
import { CATALOG_TAG } from "./cache";
import { catalogFetch } from "@/lib/supabase/public";
import { revalidateCatalog } from "./revalidate";

type Result = { data?: unknown; error?: unknown };

function fakeSupabase(results: Result[]) {
  const queue = [...results];
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          const next = queue.shift() ?? {};
          return (resolve: (value: unknown) => void) =>
            resolve({ data: next.data ?? null, error: next.error ?? null });
        }
        return () => builder;
      },
    },
  );
  return { from: () => builder };
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.mocked(updateTag).mockClear();
  vi.mocked(revalidatePath).mockClear();
});

describe("revalidateCatalog", () => {
  it("expira la etiqueta que usan las lecturas públicas", async () => {
    revalidateCatalog();
    expect(updateTag).toHaveBeenCalledWith(CATALOG_TAG);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]"));
    await catalogFetch("https://example.test/rest/v1/product");
    const init = fetchSpy.mock.calls[0][1] as { next?: { tags?: string[] } };
    expect(init.next?.tags).toEqual([CATALOG_TAG]);
    fetchSpy.mockRestore();
  });
});

describe("invalidación después de mutaciones del panel", () => {
  it("ocultar un producto invalida la tienda", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase([{ data: { id: "p1" } }, {}]) as never,
    );

    const result = await toggleProductAvailability(
      { error: null },
      form({ productId: "p1", available: "false" }),
    );

    expect(result).toEqual({ error: null });
    expect(updateTag).toHaveBeenCalledWith(CATALOG_TAG);
  });

  it("si la actualización falla no invalida nada", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase([{ data: { id: "p1" } }, { error: { message: "boom" } }]) as never,
    );

    const result = await toggleProductAvailability(
      { error: null },
      form({ productId: "p1", available: "false" }),
    );

    expect(result.error).not.toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("desactivar una oferta invalida precios y banner", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase([
        {
          data: {
            id: "o1",
            product_id: "p1",
            offer_price: 80,
            starts_at: "2026-10-01T00:00:00.000Z",
            ends_at: "2099-01-01T00:00:00.000Z",
            featured: false,
            product: { price: 100 },
          },
        },
        {},
      ]) as never,
    );

    const result = await setOfferEnabled(
      { error: null },
      form({ offerId: "o1", enabled: "false" }),
    );

    expect(result).toEqual({ error: null });
    expect(updateTag).toHaveBeenCalledWith(CATALOG_TAG);
    expect(revalidatePath).not.toHaveBeenCalledWith("/", "layout");
  });
});
