export type ImageLoadStatus = "loading" | "loaded" | "error";

export type ImageLoadRecord = { src: string; status: Exclude<ImageLoadStatus, "loading"> };

export function imageSrcKey(src: string | { src: string } | { default: { src: string } }): string {
  if (typeof src === "string") return src;
  if ("default" in src) return src.default.src;
  return src.src;
}

export function resolveImageStatus(
  record: ImageLoadRecord | null,
  srcKey: string,
): ImageLoadStatus {
  if (!record || record.src !== srcKey) return "loading";
  return record.status;
}
