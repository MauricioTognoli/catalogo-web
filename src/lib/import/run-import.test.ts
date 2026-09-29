import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { IMPORT_LIMITS, type Cell, type ImportProduct } from "./product-import";
import { runProductImport, type ImportDeps } from "./run-import";
import { buildTemplate, readProductSheet } from "./xlsx";

const HEADER = ["Nombre", "Descripción", "Precio", "Material", "Categoría", "Disponibilidad", "Stock"];

function xlsxFile(rows: Cell[][], name = "productos.xlsx") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Productos");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return fileFrom(new Uint8Array(bytes), name);
}

function fileFrom(bytes: Uint8Array, name: string) {
  return { size: bytes.byteLength, name, bytes: async () => bytes };
}

function deps(overrides: Partial<ImportDeps> = {}): ImportDeps {
  return {
    loadCategories: vi.fn(async () => [{ id: "cat-1", name: "Anillos" }]),
    findExisting: vi.fn(async () => ({ slugs: [], names: [] })),
    insertAll: vi.fn(async (products: ImportProduct[]) => ({
      ok: true as const,
      created: products.map((product, index) => ({ id: `p${index}`, name: product.name })),
    })),
    ...overrides,
  };
}

const VALID_ROWS: Cell[][] = [
  HEADER,
  ["Anillo solitario", null, 45000, "Oro", "Anillos", "Sí", 3],
  ["Aros perla", null, "12.000", null, null, "No", 0],
];

describe("readProductSheet / buildTemplate", () => {
  it("la plantilla descargada se lee con los encabezados correctos", () => {
    const read = readProductSheet(buildTemplate(["Anillos"]));
    expect(read).toEqual({ ok: true, sheet: [HEADER] });
  });

  it("rechaza archivos que no son .xlsx", () => {
    const csv = new TextEncoder().encode("Nombre,Precio,Stock\nAnillo,1,1");
    expect(readProductSheet(csv).ok).toBe(false);
  });
});

describe("runProductImport", () => {
  it("la vista previa no guarda nada", async () => {
    const d = deps();
    const outcome = await runProductImport(xlsxFile(VALID_ROWS), "preview", d);
    expect(outcome).toMatchObject({ kind: "preview", validCount: 2, errorCount: 0 });
    expect(d.insertAll).not.toHaveBeenCalled();
  });

  it("confirmar guarda todos los productos en una sola operación", async () => {
    const d = deps();
    const outcome = await runProductImport(xlsxFile(VALID_ROWS), "commit", d);
    expect(outcome).toEqual({
      kind: "imported",
      created: [
        { id: "p0", name: "Anillo solitario" },
        { id: "p1", name: "Aros perla" },
      ],
    });
    expect(d.insertAll).toHaveBeenCalledTimes(1);
    expect(vi.mocked(d.insertAll).mock.calls[0][0]).toHaveLength(2);
  });

  it("un archivo con errores no guarda nada, ni siquiera las filas válidas", async () => {
    const d = deps();
    const outcome = await runProductImport(
      xlsxFile([...VALID_ROWS, ["Collar", null, 100, null, "Collares", null, 1]]),
      "commit",
      d,
    );
    expect(outcome).toMatchObject({ kind: "preview", validCount: 2, errorCount: 1 });
    expect(d.insertAll).not.toHaveBeenCalled();
  });

  it("revalida al confirmar: un producto creado después de la vista previa bloquea todo", async () => {
    const d = deps({
      findExisting: vi.fn(async () => ({ slugs: ["aros-perla"], names: [] })),
    });
    const outcome = await runProductImport(xlsxFile(VALID_ROWS), "commit", d);
    expect(outcome).toMatchObject({ kind: "preview", errorCount: 1 });
    expect(d.insertAll).not.toHaveBeenCalled();
  });

  it("si falla el guardado, informa que no se guardó nada", async () => {
    const d = deps({
      insertAll: vi.fn(async () => ({ ok: false as const, error: "No se guardó ningún producto." })),
    });
    const outcome = await runProductImport(xlsxFile(VALID_ROWS), "commit", d);
    expect(outcome).toMatchObject({ kind: "save_failed", error: "No se guardó ningún producto." });
  });

  it("consulta existentes solo por los slugs y nombres del archivo", async () => {
    const d = deps();
    await runProductImport(xlsxFile(VALID_ROWS), "preview", d);
    expect(d.findExisting).toHaveBeenCalledWith({
      slugs: ["anillo-solitario", "aros-perla"],
      names: ["Anillo solitario", "Aros perla"],
    });
  });

  it("el archivo no puede elegir el negocio: columnas ajenas invalidan el archivo", async () => {
    const d = deps();
    const outcome = await runProductImport(
      xlsxFile([[...HEADER, "business_id"], ["Anillo", null, 1, null, null, null, 1, "otro"]]),
      "commit",
      d,
    );
    expect(outcome).toEqual({
      kind: "file_error",
      errors: ['La columna "business_id" no es parte de la plantilla.'],
    });
    expect(d.insertAll).not.toHaveBeenCalled();
    // Los productos que llegan a insertAll no traen negocio: lo agrega el servidor.
    const ok = deps();
    await runProductImport(xlsxFile(VALID_ROWS), "commit", ok);
    expect(vi.mocked(ok.insertAll).mock.calls[0][0][0]).not.toHaveProperty("businessId");
  });

  it("límites de tamaño, extensión y cantidad de filas", async () => {
    const d = deps();
    expect(
      await runProductImport(
        { size: IMPORT_LIMITS.maxFileBytes + 1, name: "a.xlsx", bytes: async () => new Uint8Array() },
        "preview",
        d,
      ),
    ).toMatchObject({ kind: "file_error" });
    expect(await runProductImport(xlsxFile(VALID_ROWS, "a.csv"), "preview", d)).toMatchObject({
      kind: "file_error",
    });

    const many = Array.from({ length: IMPORT_LIMITS.maxRows + 5 }, (_, i) => [
      `Producto ${i}`, null, 1, null, null, null, 1,
    ]);
    expect(await runProductImport(xlsxFile([HEADER, ...many]), "preview", d)).toMatchObject({
      kind: "file_error",
    });
    expect(d.loadCategories).not.toHaveBeenCalled();
  });
});
