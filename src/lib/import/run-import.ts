/**
 * Flujo completo de una importación, con el acceso a datos inyectado para
 * poder probarlo sin Supabase. La Server Action conecta estas
 * dependencias con el negocio de la sesión.
 */
import {
  IMPORT_LIMITS,
  catalogLookups,
  normalizeText,
  parseSheet,
  validateRows,
  type ImportProduct,
  type ImportRowPreview,
} from "./product-import";
import { readProductSheet } from "./xlsx";

export type ImportDeps = {
  /** Categorías del negocio de la sesión. */
  loadCategories: () => Promise<{ id: string; name: string }[]>;
  /** Productos del negocio que coinciden por slug o nombre (solo esos). */
  findExisting: (lookups: {
    slugs: string[];
    names: string[];
  }) => Promise<{ slugs: string[]; names: string[] }>;
  /**
   * Inserta TODOS los productos en una sola operación atómica: o se
   * guardan todos o ninguno. El negocio lo agrega la implementación a
   * partir de la sesión, nunca del archivo.
   */
  insertAll: (
    products: ImportProduct[],
  ) => Promise<{ ok: true; created: { id: string; name: string }[] } | { ok: false; error: string }>;
};

export type ImportOutcome =
  /** El archivo no se pudo leer o sus encabezados no sirven. */
  | { kind: "file_error"; errors: string[] }
  /** Vista previa (o confirmación rechazada por errores en filas). */
  | {
      kind: "preview";
      rows: ImportRowPreview[];
      validCount: number;
      errorCount: number;
    }
  /** Guardado exitoso. */
  | { kind: "imported"; created: { id: string; name: string }[] }
  /** Las filas eran válidas pero el guardado falló: no se guardó nada. */
  | { kind: "save_failed"; error: string; rows: ImportRowPreview[] };

export async function runProductImport(
  file: { size: number; name: string; bytes: () => Promise<Uint8Array> },
  mode: "preview" | "commit",
  deps: ImportDeps,
): Promise<ImportOutcome> {
  if (file.size === 0) {
    return { kind: "file_error", errors: ["El archivo está vacío."] };
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    return {
      kind: "file_error",
      errors: [
        `El archivo pesa más de ${IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB. Quitá hojas o formatos que no uses, o dividilo.`,
      ],
    };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      kind: "file_error",
      errors: ["Subí un archivo Excel .xlsx (podés partir de la plantilla)."],
    };
  }

  const read = readProductSheet(await file.bytes());
  if (!read.ok) return { kind: "file_error", errors: [read.error] };

  const parsed = parseSheet(read.sheet);
  if (!parsed.ok) return { kind: "file_error", errors: parsed.fileErrors };

  const [categories, existing] = await Promise.all([
    deps.loadCategories(),
    deps.findExisting(catalogLookups(parsed.rows)),
  ]);

  const validation = validateRows(parsed.rows, {
    categories,
    existingSlugs: new Set(existing.slugs),
    existingNames: new Set(existing.names.map(normalizeText)),
  });

  // La confirmación vuelve a validar todo contra el catálogo actual: si
  // algo cambió desde la vista previa (otro producto con ese nombre, una
  // categoría borrada), no se guarda nada.
  if (mode === "preview" || validation.products === null) {
    return {
      kind: "preview",
      rows: validation.rows,
      validCount: validation.validCount,
      errorCount: validation.errorCount,
    };
  }

  const saved = await deps.insertAll(validation.products);
  if (!saved.ok) {
    return { kind: "save_failed", error: saved.error, rows: validation.rows };
  }
  return { kind: "imported", created: saved.created };
}
