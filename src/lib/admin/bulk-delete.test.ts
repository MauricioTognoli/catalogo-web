import { describe, expect, it, vi } from "vitest";
import {
  BULK_DELETE_LIMIT,
  parseProductIds,
  productImagePaths,
  runBulkDelete,
  type BulkDeleteDeps,
} from "./bulk-delete";

const ID_A = "00000000-0000-4000-8000-00000000000a";
const ID_B = "00000000-0000-4000-8000-00000000000b";
const ID_C = "00000000-0000-4000-8000-00000000000c";

function imageUrl(path: string) {
  return `https://x.supabase.co/storage/v1/object/public/product-images/${path}`;
}

function deps(overrides: Partial<BulkDeleteDeps> = {}): BulkDeleteDeps {
  return {
    loadOwned: vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, imageUrls: [imageUrl(`biz/${id}.jpg`)] })),
    ),
    deleteOne: vi.fn(async () => true),
    removeImages: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("parseProductIds", () => {
  it("acepta uuids y quita duplicados", () => {
    expect(parseProductIds([ID_A, ID_B, ID_A])).toEqual({ ok: true, value: [ID_A, ID_B] });
  });

  it("rechaza listas vacías o que no son arrays", () => {
    expect(parseProductIds([]).ok).toBe(false);
    expect(parseProductIds("abc").ok).toBe(false);
    expect(parseProductIds(null).ok).toBe(false);
  });

  it("rechaza ids que no son uuid", () => {
    expect(parseProductIds([ID_A, "1 or 1=1"]).ok).toBe(false);
    expect(parseProductIds([ID_A, 3]).ok).toBe(false);
  });

  it("limita la cantidad por pedido", () => {
    const ids = Array.from({ length: BULK_DELETE_LIMIT + 1 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(parseProductIds(ids).ok).toBe(false);
  });
});

describe("productImagePaths", () => {
  it("deriva los paths del bucket e ignora URLs ajenas", () => {
    expect(
      productImagePaths([imageUrl("biz/uno.jpg"), "https://otro.com/foto.jpg"]),
    ).toEqual(["biz/uno.jpg"]);
  });
});

describe("runBulkDelete", () => {
  it("elimina todos y borra sus imágenes de Storage", async () => {
    const d = deps();
    const result = await runBulkDelete([ID_A, ID_B], d);

    expect(result).toEqual({ ok: true, value: { deletedIds: [ID_A, ID_B], failed: [] } });
    expect(d.removeImages).toHaveBeenCalledWith([`biz/${ID_A}.jpg`, `biz/${ID_B}.jpg`]);
  });

  it("no borra productos que no pertenecen al negocio", async () => {
    const d = deps({
      loadOwned: vi.fn(async () => [{ id: ID_A, imageUrls: [] }]),
    });
    const result = await runBulkDelete([ID_A, ID_B], d);

    expect(d.deleteOne).toHaveBeenCalledTimes(1);
    expect(d.deleteOne).toHaveBeenCalledWith(ID_A);
    expect(result).toEqual({
      ok: true,
      value: { deletedIds: [ID_A], failed: [{ id: ID_B, reason: "not_found" }] },
    });
  });

  it("informa fallos parciales y solo borra imágenes de los eliminados", async () => {
    const d = deps({
      deleteOne: vi.fn(async (id: string) => {
        if (id === ID_B) throw new Error("red");
        return id !== ID_C;
      }),
    });
    const result = await runBulkDelete([ID_A, ID_B, ID_C], d);

    expect(result).toEqual({
      ok: true,
      value: {
        deletedIds: [ID_A],
        failed: [
          { id: ID_B, reason: "delete_failed" },
          { id: ID_C, reason: "delete_failed" },
        ],
      },
    });
    expect(d.removeImages).toHaveBeenCalledWith([`biz/${ID_A}.jpg`]);
  });

  it("si no se puede verificar la pertenencia no borra nada", async () => {
    const d = deps({ loadOwned: vi.fn(async () => null) });
    const result = await runBulkDelete([ID_A], d);

    expect(result.ok).toBe(false);
    expect(d.deleteOne).not.toHaveBeenCalled();
    expect(d.removeImages).not.toHaveBeenCalled();
  });

  it("un error de Storage no convierte el borrado en fallo", async () => {
    const d = deps({ removeImages: vi.fn(async () => Promise.reject(new Error("storage"))) });
    const result = await runBulkDelete([ID_A], d);

    expect(result).toEqual({ ok: true, value: { deletedIds: [ID_A], failed: [] } });
  });

  it("no llama a Storage si no hay imágenes", async () => {
    const d = deps({ loadOwned: vi.fn(async () => [{ id: ID_A, imageUrls: [] }]) });
    await runBulkDelete([ID_A], d);

    expect(d.removeImages).not.toHaveBeenCalled();
  });
});
