/**
 * Deriva el path dentro de un bucket público a partir de su URL pública,
 * sin necesidad de guardar el path por separado en la base de datos.
 * Funciona porque la URL pública de Supabase Storage incluye el path
 * completo de forma determinística: /storage/v1/object/public/{bucket}/{path}.
 */
export function getStoragePathFromPublicUrl(
  url: string,
  bucketName: string,
): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(index + marker.length));
}
