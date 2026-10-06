import { updateTag } from "next/cache";
import { CATALOG_TAG } from "./cache";

export function revalidateCatalog() {
  updateTag(CATALOG_TAG);
}
