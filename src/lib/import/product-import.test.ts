import { describe, expect, it } from "vitest";
import {
  IMPORT_LIMITS,
  catalogLookups,
  parseAvailability,
  parseHeaders,
  parsePrice,
  parseSheet,
  parseStock,
  validateRows,
  type CatalogContext,
  type Cell,
} from "./product-import";

const HEADER: Cell[] = [
  "Nombre",
  "Descripción",
  "Precio",
  "Material",
  "Categoría",
  "Disponibilidad",
  "Stock",
];

const emptyCatalog: CatalogContext = {
  categories: [{ id: "cat-anillos", name: "Anillos" }],
  existingSlugs: new Set(),
  existingNames: new Set(),
};

function sheet(...rows: Cell[][]): Cell[][] {
  return [HEADER, ...rows];
}

function validate(rows: Cell[][], catalog: CatalogContext = emptyCatalog) {
  const parsed = parseSheet(sheet(...rows));
  if (!parsed.ok) throw new Error(parsed.fileErrors.join(" "));
  return validateRows(parsed.rows, catalog);
}

describe("parseHeaders", () => {
  it("acepta la plantilla en cualquier orden, sin tildes ni mayúsculas", () => {
    const result = parseHeaders(["stock", "PRECIO", " nombre ", "categoria"]);
    expect(result).toEqual({ ok: true, columns: { stock: 0, price: 1, name: 2, category: 3 } });
  });

  it("exige las columnas obligatorias", () => {
    const result = parseHeaders(["Nombre", "Precio"]);
    expect(result).toEqual({ ok: false, errors: ['Falta la columna obligatoria "Stock".'] });
  });

  it("rechaza columnas desconocidas o repetidas", () => {
    const result = parseHeaders([...HEADER, "business_id", "Precio"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('La columna "business_id" no es parte de la plantilla.');
    expect(result.errors).toContain('La columna "Precio" está repetida.');
  });
});

describe("parsePrice", () => {
  it.each([
    [15000, 15000],
    ["15000", 15000],
    ["15000.50", 15000.5],
    ["15.000", 15000],
    ["15.000,50", 15000.5],
    ["1.250.000", 1250000],
    ["$ 2.500", 2500],
    ["0", 0],
  ])("%s -> %s", (input, expected) => {
    expect(parsePrice(input)).toEqual({ ok: true, value: expected });
  });

  it.each([[""], [null], ["abc"], ["-10"], [-1], ["10,555"], [Number.NaN]])(
    "rechaza %s",
    (input) => {
      expect(parsePrice(input as Cell).ok).toBe(false);
    },
  );
});

describe("parseStock", () => {
  it("acepta enteros no negativos, como número o texto", () => {
    expect(parseStock(3)).toEqual({ ok: true, value: 3 });
    expect(parseStock("0")).toEqual({ ok: true, value: 0 });
  });

  it("es obligatorio y entero no negativo", () => {
    expect(parseStock(null)).toMatchObject({ ok: false, error: expect.stringMatching(/obligatorio/) });
    expect(parseStock(2.5).ok).toBe(false);
    expect(parseStock(-1).ok).toBe(false);
    expect(parseStock("tres").ok).toBe(false);
    expect(parseStock(100000).ok).toBe(false);
  });
});

describe("parseAvailability", () => {
  it("interpreta Sí/No y variantes; vacío es visible", () => {
    expect(parseAvailability("Sí")).toEqual({ ok: true, value: true });
    expect(parseAvailability("no")).toEqual({ ok: true, value: false });
    expect(parseAvailability("Oculto")).toEqual({ ok: true, value: false });
    expect(parseAvailability(false)).toEqual({ ok: true, value: false });
    expect(parseAvailability(null)).toEqual({ ok: true, value: true });
    expect(parseAvailability("tal vez").ok).toBe(false);
  });
});

describe("parseSheet", () => {
  it("informa el número de fila de Excel y saltea filas vacías", () => {
    const parsed = parseSheet(
      sheet(
        ["Anillo", null, 1000, null, null, null, 2],
        [null, null, null, null, null, null, null],
        ["Aros", null, 2000, null, null, null, 1],
      ),
    );
    expect(parsed.ok && parsed.rows.map((row) => row.rowNumber)).toEqual([2, 4]);
  });

  it("archivo sin encabezados, sin filas o demasiado grande", () => {
    expect(parseSheet([]).ok).toBe(false);
    expect(parseSheet([HEADER]).ok).toBe(false);
    const tooMany = Array.from({ length: IMPORT_LIMITS.maxRows + 1 }, (_, i) => [
      `Producto ${i}`, null, 1, null, null, null, 1,
    ]);
    const parsed = parseSheet(sheet(...tooMany));
    expect(parsed.ok).toBe(false);
  });

  it("junta todos los errores de formato de la fila", () => {
    const parsed = parseSheet(sheet(["A", null, "gratis", null, null, "quizás", null]));
    if (!parsed.ok) throw new Error("inválido");
    expect(parsed.rows[0].errors).toEqual([
      "El nombre tiene que tener entre 2 y 120 caracteres.",
      'El precio "gratis" no es un número.',
      "El stock es obligatorio para productos nuevos.",
      'Disponibilidad "quizás" no reconocida: usá "Sí" o "No".',
    ]);
  });
});

describe("validateRows", () => {
  it("un archivo válido produce los productos a crear", () => {
    const result = validate([
      ["Anillo solitario", "Oro", "45.000", "Oro 18k", "anillos", "Sí", 3],
      ["Aros perla", null, 12000, null, null, "No", 0],
    ]);
    expect(result.errorCount).toBe(0);
    expect(result.products).toEqual([
      {
        name: "Anillo solitario",
        slug: "anillo-solitario",
        description: "Oro",
        price: 45000,
        material: "Oro 18k",
        categoryId: "cat-anillos",
        available: true,
        stock: 3,
      },
      {
        name: "Aros perla",
        slug: "aros-perla",
        description: null,
        price: 12000,
        material: null,
        categoryId: null,
        available: false,
        stock: 0,
      },
    ]);
  });

  it("no crea categorías: una desconocida es error de la fila", () => {
    const result = validate([["Collar", null, 1000, null, "Collares", null, 1]]);
    expect(result.rows[0].errors[0]).toMatch(/La categoría "Collares" no existe/);
    expect(result.products).toBeNull();
  });

  it("detecta nombres repetidos dentro del archivo (sin tildes ni mayúsculas)", () => {
    const result = validate([
      ["Anillo Luna", null, 1000, null, null, null, 1],
      ["Aros", null, 1000, null, null, null, 1],
      ["anillo luna", null, 1000, null, null, null, 1],
    ]);
    expect(result.rows[0].errors).toEqual(["Repite el nombre de la fila 4 (o genera la misma URL)."]);
    expect(result.rows[2].errors).toEqual(["Repite el nombre de la fila 2 (o genera la misma URL)."]);
    expect(result.rows[1].errors).toEqual([]);
  });

  it("detecta nombres distintos que generan el mismo slug", () => {
    const result = validate([
      ["Anillo: Luna", null, 1000, null, null, null, 1],
      ["Anillo Luna!", null, 1000, null, null, null, 1],
    ]);
    expect(result.errorCount).toBe(2);
  });

  it("no sobrescribe productos existentes (por slug o nombre)", () => {
    const result = validate(
      [
        ["Anillo solitario", null, 1000, null, null, null, 1],
        ["Aros Perla", null, 1000, null, null, null, 1],
        ["Pulsera", null, 1000, null, null, null, 1],
      ],
      {
        ...emptyCatalog,
        existingSlugs: new Set(["anillo-solitario"]),
        existingNames: new Set(["aros perla"]),
      },
    );
    expect(result.rows[0].errors[0]).toMatch(/Ya existe un producto/);
    expect(result.rows[1].errors[0]).toMatch(/Ya existe un producto/);
    expect(result.rows[2].errors).toEqual([]);
  });

  it("todo o nada: con una fila inválida no hay productos para guardar", () => {
    const result = validate([
      ["Anillo", null, 1000, null, null, null, 1],
      ["Aros", null, 1000, null, null, null, null],
    ]);
    expect(result).toMatchObject({ validCount: 1, errorCount: 1, products: null });
  });

  it("consulta al catálogo solo los slugs y nombres del archivo", () => {
    const parsed = parseSheet(
      sheet(["Anillo Luna", null, 1, null, null, null, 1], ["anillo luna", null, 1, null, null, null, 1]),
    );
    if (!parsed.ok) throw new Error("inválido");
    expect(catalogLookups(parsed.rows)).toEqual({
      slugs: ["anillo-luna"],
      names: ["Anillo Luna", "anillo luna"],
    });
  });
});
