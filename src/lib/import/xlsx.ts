import * as XLSX from "xlsx";
import { IMPORT_COLUMNS, IMPORT_LIMITS, normalizeText, type Cell } from "./product-import";

export const TEMPLATE_SHEET_NAME = "Productos";
export const TEMPLATE_FILE_NAME = "plantilla-productos.xlsx";
export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Un .xlsx es un ZIP: tiene que empezar con "PK\x03\x04". */
export function looksLikeXlsx(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

export type SheetReadResult =
  | { ok: true; sheet: Cell[][] }
  | { ok: false; error: string };

/**
 * Lee la hoja de productos (la llamada "Productos" o, si no está, la
 * primera). Se leen como máximo unas filas más que el límite: un archivo
 * enorme no se procesa entero, se rechaza.
 */
export function readProductSheet(bytes: Uint8Array): SheetReadResult {
  if (!looksLikeXlsx(bytes)) {
    return { ok: false, error: "El archivo no es un Excel .xlsx válido." };
  }

  const rowLimit = IMPORT_LIMITS.maxRows + 1;
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      // +1 encabezado, +1 para detectar que se pasó del límite.
      sheetRows: rowLimit + 1,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. ¿Es un Excel .xlsx?" };
  }

  const sheetName =
    workbook.SheetNames.find(
      (name) => normalizeText(name) === normalizeText(TEMPLATE_SHEET_NAME),
    ) ?? workbook.SheetNames[0];
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!worksheet) {
    return { ok: false, error: "El archivo no tiene hojas." };
  }

  // Con sheetRows, SheetJS deja en !fullref el rango real de la hoja.
  const fullRef = worksheet["!fullref"] ?? worksheet["!ref"];
  if (fullRef && XLSX.utils.decode_range(fullRef).e.r + 1 > rowLimit + 1) {
    return {
      ok: false,
      error: `El archivo supera las ${IMPORT_LIMITS.maxRows} filas de productos. Dividilo en varios archivos.`,
    };
  }

  const sheet = XLSX.utils.sheet_to_json<Cell[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  return { ok: true, sheet };
}

const INSTRUCTIONS: string[][] = [
  ["Cómo completar la plantilla"],
  [""],
  ["• Una fila por producto, en la hoja «Productos». No cambies los títulos de las columnas."],
  ["• Obligatorios: Nombre, Precio y Stock."],
  ["• Precio: número sin símbolo, por ejemplo 15000 o 15000,50."],
  ["• Stock: unidades enteras, 0 o más."],
  ["• Categoría: tiene que existir en el panel (ver hoja «Categorías»). Vacía = sin categoría."],
  ["• Disponibilidad: «Sí» (se muestra en la tienda) o «No» (queda oculto). Vacía = Sí."],
  [`• Hasta ${IMPORT_LIMITS.maxRows} productos por archivo.`],
  [""],
  ["Limitaciones de esta versión"],
  ["• Solo crea productos nuevos: si el nombre ya existe, la fila se rechaza (no se sobrescribe)."],
  ["• No importa talles ni imágenes: agregalos después desde la ficha de cada producto."],
  ["• Si alguna fila tiene errores, no se guarda ninguna: corregí el archivo y volvé a subirlo."],
  [""],
  ["Ejemplo"],
  IMPORT_COLUMNS.map((column) => column.header),
  ["Anillo solitario", "Oro 18k con circón", "45000", "Oro 18k", "Anillos", "Sí", "3"],
];

/** Plantilla .xlsx: hoja de productos vacía, instrucciones y categorías. */
export function buildTemplate(categoryNames: string[]): Uint8Array {
  const workbook = XLSX.utils.book_new();

  const products = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS.map((column) => column.header)]);
  products["!cols"] = [
    { wch: 32 },
    { wch: 48 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, products, TEMPLATE_SHEET_NAME);

  const instructions = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructions["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instrucciones");

  const categories = XLSX.utils.aoa_to_sheet([
    ["Categorías disponibles"],
    ...(categoryNames.length > 0
      ? categoryNames.map((name) => [name])
      : [["(Todavía no hay categorías: creálas en el panel o dejá la columna vacía)"]]),
  ]);
  categories["!cols"] = [{ wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, categories, "Categorías");

  // Con type "array" SheetJS devuelve un ArrayBuffer.
  return new Uint8Array(
    XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer,
  );
}
