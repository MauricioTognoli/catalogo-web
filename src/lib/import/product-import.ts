/**
 * Importación de productos desde Excel: encabezados, conversión de
 * celdas y validación por fila. Puro (sin Supabase ni archivos): el
 * servidor le pasa las filas leídas del .xlsx y los datos del catálogo
 * que necesita consultar. Ver product-import.test.ts.
 *
 * Primera versión: solo productos nuevos, sin talles ni imágenes (se
 * completan después desde la ficha de edición).
 */
import { MAX_STOCK, parseStockInput } from "@/lib/stock/availability";
import { slugify } from "@/lib/utils/slugify";

export const IMPORT_LIMITS = {
  /** Filas de datos por archivo (sin contar el encabezado). */
  maxRows: 500,
  maxFileBytes: 2 * 1024 * 1024,
} as const;

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_MATERIAL_LENGTH = 120;
/** numeric(12,2) de product.price. */
const MAX_PRICE = 9_999_999_999.99;

export const IMPORT_COLUMNS = [
  { key: "name", header: "Nombre", required: true },
  { key: "description", header: "Descripción", required: false },
  { key: "price", header: "Precio", required: true },
  { key: "material", header: "Material", required: false },
  { key: "category", header: "Categoría", required: false },
  { key: "available", header: "Disponibilidad", required: false },
  { key: "stock", header: "Stock", required: true },
] as const;

export type ColumnKey = (typeof IMPORT_COLUMNS)[number]["key"];
export type Cell = string | number | boolean | Date | null | undefined;

/** Minúsculas, sin tildes ni espacios de más: "  Categoría " -> "categoria". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

function isEmptyRow(cells: Cell[]): boolean {
  return cells.every((cell) => cellText(cell) === "");
}

// ---------------------------------------------------------------------
// Encabezados
// ---------------------------------------------------------------------

export type HeaderResult =
  | { ok: true; columns: Partial<Record<ColumnKey, number>> }
  | { ok: false; errors: string[] };

/**
 * El orden de las columnas es libre; los nombres no. Faltar una columna
 * obligatoria, repetirla o traer columnas desconocidas invalida el
 * archivo (evita, por ejemplo, un "Precios" mal escrito que se ignore).
 */
export function parseHeaders(headerRow: Cell[]): HeaderResult {
  const errors: string[] = [];
  const columns: Partial<Record<ColumnKey, number>> = {};
  const byHeader = new Map<string, ColumnKey>(
    IMPORT_COLUMNS.map((column) => [normalizeText(column.header), column.key]),
  );

  headerRow.forEach((cell, index) => {
    const text = cellText(cell);
    if (text === "") return;
    const key = byHeader.get(normalizeText(text));
    if (!key) {
      errors.push(`La columna "${text}" no es parte de la plantilla.`);
      return;
    }
    if (columns[key] !== undefined) {
      errors.push(`La columna "${text}" está repetida.`);
      return;
    }
    columns[key] = index;
  });

  for (const column of IMPORT_COLUMNS) {
    if (column.required && columns[column.key] === undefined) {
      errors.push(`Falta la columna obligatoria "${column.header}".`);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, columns };
}

// ---------------------------------------------------------------------
// Celdas
// ---------------------------------------------------------------------

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Precio desde Excel: número, o texto en formato argentino ("15.000,50",
 * "$ 15000") o con punto decimal ("15000.50").
 */
export function parsePrice(cell: Cell): Parsed<number> {
  let value: number;

  if (typeof cell === "number") {
    value = cell;
  } else {
    const text = cellText(cell).replace(/[$\s]/g, "");
    if (text === "") return { ok: false, error: "El precio es obligatorio." };

    let normalized: string;
    if (text.includes(",")) {
      // Coma decimal: los puntos son de miles.
      normalized = text.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
      // "15.000" o "1.250.000": puntos de miles.
      normalized = text.replace(/\./g, "");
    } else {
      normalized = text;
    }
    value = /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
  }

  if (!Number.isFinite(value)) {
    return { ok: false, error: `El precio "${cellText(cell)}" no es un número.` };
  }
  if (value < 0) return { ok: false, error: "El precio no puede ser negativo." };
  if (value > MAX_PRICE) return { ok: false, error: "El precio es demasiado alto." };
  // Tolerancia por la representación binaria (0.1 + 0.2, etc.).
  const cents = value * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    return { ok: false, error: "El precio admite hasta 2 decimales." };
  }

  return { ok: true, value: Math.round(value * 100) / 100 };
}

/** Stock obligatorio: entero entre 0 y MAX_STOCK (misma regla que el panel). */
export function parseStock(cell: Cell): Parsed<number> {
  const text = cellText(cell);
  if (text === "") {
    return { ok: false, error: "El stock es obligatorio para productos nuevos." };
  }
  const parsed = parseStockInput(typeof cell === "number" ? String(cell) : text);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `El stock "${text}" no es válido: tiene que ser un entero entre 0 y ${MAX_STOCK}.`,
    };
  }
  return parsed;
}

const YES = new Set(["si", "s", "yes", "true", "1", "visible", "disponible"]);
const NO = new Set(["no", "n", "false", "0", "oculto", "no disponible"]);

/** Disponibilidad: vacía = visible (igual que el formulario del panel). */
export function parseAvailability(cell: Cell): Parsed<boolean> {
  if (typeof cell === "boolean") return { ok: true, value: cell };
  const text = normalizeText(cellText(cell));
  if (text === "") return { ok: true, value: true };
  if (YES.has(text)) return { ok: true, value: true };
  if (NO.has(text)) return { ok: true, value: false };
  return {
    ok: false,
    error: `Disponibilidad "${cellText(cell)}" no reconocida: usá "Sí" o "No".`,
  };
}

function optionalText(cell: Cell, max: number, label: string): Parsed<string | null> {
  const text = cellText(cell);
  if (text.length > max) {
    return { ok: false, error: `${label} supera los ${max} caracteres.` };
  }
  return { ok: true, value: text === "" ? null : text };
}

// ---------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------

export type ImportProduct = {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  material: string | null;
  categoryId: string | null;
  available: boolean;
  stock: number;
};

/** Lo que ve el dueño en la vista previa (con o sin errores). */
export type ImportRowPreview = {
  /** Número de fila en Excel (el encabezado es la 1). */
  rowNumber: number;
  name: string;
  price: number | null;
  stock: number | null;
  categoryName: string | null;
  available: boolean | null;
  errors: string[];
};

type RowDraft = ImportRowPreview & {
  slug: string;
  description: string | null;
  material: string | null;
};

function parseRow(
  cells: Cell[],
  columns: Partial<Record<ColumnKey, number>>,
  rowNumber: number,
): RowDraft {
  const get = (key: ColumnKey): Cell => {
    const index = columns[key];
    return index === undefined ? null : cells[index];
  };
  const errors: string[] = [];

  const name = cellText(get("name"));
  if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
    errors.push(
      name === ""
        ? "Falta el nombre."
        : `El nombre tiene que tener entre 2 y ${MAX_NAME_LENGTH} caracteres.`,
    );
  }
  const slug = slugify(name);
  if (name.length >= 2 && slug === "") {
    errors.push("El nombre tiene que incluir al menos una letra o número.");
  }

  const price = parsePrice(get("price"));
  if (!price.ok) errors.push(price.error);

  const stock = parseStock(get("stock"));
  if (!stock.ok) errors.push(stock.error);

  const available = parseAvailability(get("available"));
  if (!available.ok) errors.push(available.error);

  const description = optionalText(get("description"), MAX_DESCRIPTION_LENGTH, "La descripción");
  if (!description.ok) errors.push(description.error);

  const material = optionalText(get("material"), MAX_MATERIAL_LENGTH, "El material");
  if (!material.ok) errors.push(material.error);

  const categoryName = cellText(get("category"));

  return {
    rowNumber,
    name,
    slug,
    price: price.ok ? price.value : null,
    stock: stock.ok ? stock.value : null,
    available: available.ok ? available.value : null,
    categoryName: categoryName === "" ? null : categoryName,
    description: description.ok ? description.value : null,
    material: material.ok ? material.value : null,
    errors,
  };
}

// ---------------------------------------------------------------------
// Archivo completo
// ---------------------------------------------------------------------

export type SheetParseResult =
  | { ok: false; fileErrors: string[] }
  | { ok: true; rows: RowDraft[] };

/**
 * Filas de la hoja (la primera es el encabezado) -> filas con errores de
 * formato. Las filas vacías se ignoran pero se respeta su numeración, así
 * "fila 7" coincide con lo que el dueño ve en Excel.
 */
export function parseSheet(sheet: Cell[][]): SheetParseResult {
  const [headerRow, ...dataRows] = sheet;
  if (!headerRow || isEmptyRow(headerRow)) {
    return {
      ok: false,
      fileErrors: ["El archivo está vacío o no tiene encabezados en la primera fila."],
    };
  }

  const headers = parseHeaders(headerRow);
  if (!headers.ok) return { ok: false, fileErrors: headers.errors };

  const rows = dataRows
    .map((cells, index) => ({ cells, rowNumber: index + 2 }))
    .filter(({ cells }) => !isEmptyRow(cells ?? []))
    .map(({ cells, rowNumber }) => parseRow(cells ?? [], headers.columns, rowNumber));

  if (rows.length === 0) {
    return { ok: false, fileErrors: ["El archivo no tiene productos para importar."] };
  }
  if (rows.length > IMPORT_LIMITS.maxRows) {
    return {
      ok: false,
      fileErrors: [
        `El archivo tiene ${rows.length} productos; el máximo por importación es ${IMPORT_LIMITS.maxRows}. Dividilo en varios archivos.`,
      ],
    };
  }

  return { ok: true, rows };
}

/** Lo que hay que consultar al catálogo para validar el archivo. */
export function catalogLookups(rows: RowDraft[]) {
  return {
    slugs: [...new Set(rows.map((row) => row.slug).filter(Boolean))],
    names: [...new Set(rows.map((row) => row.name).filter(Boolean))],
  };
}

export type CatalogContext = {
  /** Categorías del negocio (se comparan sin tildes ni mayúsculas). */
  categories: { id: string; name: string }[];
  /** Slugs de productos existentes del negocio que coinciden con el archivo. */
  existingSlugs: Set<string>;
  /** Nombres existentes (normalizados) que coinciden con el archivo. */
  existingNames: Set<string>;
};

export type ImportValidation = {
  rows: ImportRowPreview[];
  /** Solo si no hay ningún error: lo que se va a insertar. */
  products: ImportProduct[] | null;
  validCount: number;
  errorCount: number;
};

/**
 * Cruza las filas con el catálogo del negocio: categorías existentes,
 * nombres/slugs repetidos en el archivo y productos que ya existen. Nunca
 * crea categorías ni reemplaza productos: eso es un error de la fila.
 */
export function validateRows(rows: RowDraft[], catalog: CatalogContext): ImportValidation {
  const categoryByName = new Map(
    catalog.categories.map((category) => [normalizeText(category.name), category]),
  );

  const rowsBySlug = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.slug) continue;
    rowsBySlug.set(row.slug, [...(rowsBySlug.get(row.slug) ?? []), row.rowNumber]);
  }

  const products: ImportProduct[] = [];
  const previews = rows.map((row): ImportRowPreview => {
    const errors = [...row.errors];

    let categoryId: string | null = null;
    if (row.categoryName) {
      const category = categoryByName.get(normalizeText(row.categoryName));
      if (category) {
        categoryId = category.id;
      } else {
        errors.push(
          `La categoría "${row.categoryName}" no existe. Creala primero en Categorías o dejala vacía.`,
        );
      }
    }

    if (row.slug) {
      const others = (rowsBySlug.get(row.slug) ?? []).filter(
        (rowNumber) => rowNumber !== row.rowNumber,
      );
      if (others.length > 0) {
        const list = others.join(", ");
        errors.push(
          others.length === 1
            ? `Repite el nombre de la fila ${list} (o genera la misma URL).`
            : `Repite el nombre de las filas ${list} (o genera la misma URL).`,
        );
      }
      if (
        catalog.existingSlugs.has(row.slug) ||
        catalog.existingNames.has(normalizeText(row.name))
      ) {
        errors.push(
          "Ya existe un producto con este nombre. La importación no modifica productos existentes.",
        );
      }
    }

    if (errors.length === 0) {
      products.push({
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: row.price!,
        material: row.material,
        categoryId,
        available: row.available!,
        stock: row.stock!,
      });
    }

    return {
      rowNumber: row.rowNumber,
      name: row.name,
      price: row.price,
      stock: row.stock,
      categoryName: row.categoryName,
      available: row.available,
      errors,
    };
  });

  const errorCount = previews.filter((row) => row.errors.length > 0).length;

  return {
    rows: previews,
    // Todo o nada: con un solo error no se importa ninguna fila.
    products: errorCount === 0 ? products : null,
    validCount: previews.length - errorCount,
    errorCount,
  };
}
