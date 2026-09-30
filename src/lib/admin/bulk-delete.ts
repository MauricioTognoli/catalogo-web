import { getStoragePathFromPublicUrl } from "@/lib/storage/getStoragePathFromPublicUrl";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const BULK_DELETE_LIMIT = 200;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BulkDeleteFailureReason = "not_found" | "delete_failed";

export type BulkDeleteResult = {
  deletedIds: string[];
  failed: { id: string; reason: BulkDeleteFailureReason }[];
};

export type BulkDeleteDeps = {
  loadOwned: (
    ids: string[],
  ) => Promise<{ id: string; imageUrls: string[] }[] | null>;
  deleteOne: (id: string) => Promise<boolean>;
  removeImages: (paths: string[]) => Promise<void>;
};

export function productImagePaths(imageUrls: string[]): string[] {
  return imageUrls
    .map((url) => getStoragePathFromPublicUrl(url, PRODUCT_IMAGES_BUCKET))
    .filter((path): path is string => path !== null);
}

export function parseProductIds(
  raw: unknown,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Elegí al menos un producto." };
  }
  if (!raw.every((id) => typeof id === "string" && UUID_PATTERN.test(id))) {
    return { ok: false, error: "Productos inválidos." };
  }
  const ids = [...new Set(raw as string[])];
  if (ids.length > BULK_DELETE_LIMIT) {
    return {
      ok: false,
      error: `Podés eliminar hasta ${BULK_DELETE_LIMIT} productos por vez.`,
    };
  }
  return { ok: true, value: ids };
}

export async function runBulkDelete(
  ids: string[],
  deps: BulkDeleteDeps,
): Promise<{ ok: true; value: BulkDeleteResult } | { ok: false; error: string }> {
  const owned = await deps.loadOwned(ids);
  if (owned === null) {
    return { ok: false, error: "No se pudieron verificar los productos. Probá de nuevo." };
  }

  const ownedById = new Map(owned.map((product) => [product.id, product]));
  const deletedIds: string[] = [];
  const failed: BulkDeleteResult["failed"] = [];
  const imagePaths: string[] = [];

  for (const id of ids) {
    const product = ownedById.get(id);
    if (!product) {
      failed.push({ id, reason: "not_found" });
      continue;
    }

    const deleted = await deps.deleteOne(id).catch(() => false);
    if (!deleted) {
      failed.push({ id, reason: "delete_failed" });
      continue;
    }

    deletedIds.push(id);
    imagePaths.push(...productImagePaths(product.imageUrls));
  }

  if (imagePaths.length > 0) {
    await deps.removeImages(imagePaths).catch(() => undefined);
  }

  return { ok: true, value: { deletedIds, failed } };
}
