import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/utils/formatPrice";
import type { CartItem } from "@/lib/cart/types";
import { buildOrderMessage } from "./buildOrderMessage";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    productSlug: "producto",
    productName: "Producto",
    productImageUrl: null,
    unitPrice: 1000,
    quantity: 1,
    sizeId: null,
    sizeLabel: null,
    ...overrides,
  };
}

describe("buildOrderMessage", () => {
  it("incluye el saludo y el nombre del negocio en negrita", () => {
    const message = buildOrderMessage("Mi Negocio", [item()]);
    expect(message).toContain("Hola! Quiero realizar el siguiente pedido:");
    expect(message).toContain("*Mi Negocio*");
  });

  it("arma un producto sin talle sin mostrar la línea de talle", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ productName: "Anillo Aurora", unitPrice: 25000, quantity: 1 }),
    ]);
    expect(message).toContain("• Anillo Aurora");
    expect(message).not.toContain("Talle:");
  });

  it("muestra el talle cuando el item lo tiene", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ productName: "Anillo Aurora", sizeLabel: "16", quantity: 2 }),
    ]);
    expect(message).toContain("Talle: 16");
  });

  it("lista varios productos, en el mismo orden recibido", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ productId: "p1", productName: "Anillo Aurora" }),
      item({ productId: "p2", productName: "Collar Luna" }),
    ]);
    const anilloIndex = message.indexOf("Anillo Aurora");
    const collarIndex = message.indexOf("Collar Luna");
    expect(anilloIndex).toBeGreaterThan(-1);
    expect(collarIndex).toBeGreaterThan(anilloIndex);
  });

  it("calcula el total de línea como precio unitario × cantidad para cantidades > 1", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ unitPrice: 25000, quantity: 2 }),
    ]);
    expect(message).toContain("Cantidad: 2");
    expect(message).toContain(formatPrice(25000)); // precio unitario
    expect(message).toContain(formatPrice(50000)); // total de línea
  });

  it("calcula el total final del pedido sumando todas las líneas", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ productId: "p1", productName: "Anillo Aurora", unitPrice: 25000, quantity: 2 }), // 50000
      item({ productId: "p2", productName: "Collar Luna", unitPrice: 35000, quantity: 1 }), // 35000
    ]);
    expect(message).toContain(formatPrice(85000));
  });

  it("conserva acentos, símbolos y emojis en nombres sin romper el mensaje", () => {
    const message = buildOrderMessage("Joyería Ñandú & Cía.", [
      item({ productName: 'Anillo "Corazón" – Edición Limitada 💍' }),
    ]);
    expect(message).toContain("Joyería Ñandú & Cía.");
    expect(message).toContain('Anillo "Corazón" – Edición Limitada 💍');
  });

  it("formatea los precios con el mismo formato que el resto del catálogo", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ unitPrice: 1500.5, quantity: 1 }),
    ]);
    expect(message).toContain(formatPrice(1500.5));
  });

  it("termina con un agradecimiento", () => {
    const message = buildOrderMessage("Mi Negocio", [item()]);
    expect(message.trim().endsWith("¡Gracias!")).toBe(true);
  });

  it("no incluye ninguna línea de talle para un carrito con productos mixtos (con y sin talle)", () => {
    const message = buildOrderMessage("Mi Negocio", [
      item({ productId: "p1", productName: "Collar Luna", sizeLabel: null }),
      item({ productId: "p2", productName: "Anillo Aurora", sizeLabel: "18" }),
    ]);
    const collarBlock = message.slice(
      message.indexOf("Collar Luna"),
      message.indexOf("Anillo Aurora"),
    );
    expect(collarBlock).not.toContain("Talle:");
    expect(message).toContain("Talle: 18");
  });
});
