import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, hasWhatsAppNumber } from "./buildWhatsAppUrl";

describe("buildWhatsAppUrl", () => {
  it("arma la URL con el número tal cual está almacenado", () => {
    const url = buildWhatsAppUrl("5491122334455", "hola");
    expect(url).toBe("https://wa.me/5491122334455?text=hola");
  });

  it("no agrega símbolos ni formato internacional al número (+, espacios, guiones)", () => {
    const url = buildWhatsAppUrl("5491122334455", "hola");
    expect(url).not.toContain("+");
    expect(url.split("?")[0]).not.toContain(" ");
    expect(url.split("?")[0]).not.toContain("-");
  });

  it("codifica el mensaje con encodeURIComponent de forma reversible", () => {
    const message = "Línea 1\nLínea 2 & más: 100%";
    const url = buildWhatsAppUrl("5491122334455", message);
    const query = url.split("?text=")[1];
    expect(query).toBe(encodeURIComponent(message));
    expect(decodeURIComponent(query)).toBe(message);
  });

  it("codifica saltos de línea, espacios y símbolos especiales del mensaje", () => {
    const url = buildWhatsAppUrl("123", "a b\nc&d=e");
    expect(url).toContain("a%20b%0Ac%26d%3De");
  });

  it("usa el número de WhatsApp recibido, no uno distinto", () => {
    const url = buildWhatsAppUrl("5491100001111", "x");
    expect(url.startsWith("https://wa.me/5491100001111?")).toBe(true);
  });
});

describe("hasWhatsAppNumber", () => {
  it("es true para un número no vacío", () => {
    expect(hasWhatsAppNumber("5491122334455")).toBe(true);
  });

  it("es false para null, undefined, cadena vacía o solo espacios", () => {
    expect(hasWhatsAppNumber(null)).toBe(false);
    expect(hasWhatsAppNumber(undefined)).toBe(false);
    expect(hasWhatsAppNumber("")).toBe(false);
    expect(hasWhatsAppNumber("   ")).toBe(false);
  });
});
