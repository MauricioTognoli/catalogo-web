import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  homeJsonLd,
  lastValidDate,
  productJsonLd,
  serializeJsonLd,
} from "./structured-data";
import type { PublicProductDetail } from "@/lib/catalog/products";

const siteUrl = new URL("https://joyeria.test");

const business = {
  name: "Joyería Sol",
  logo_url: null,
  email: null,
  address: null,
  instagram_url: "https://instagram.com/sol",
  whatsapp_number: "5491100000000",
};

const product: PublicProductDetail = {
  id: "p1",
  name: "Anillo Luna",
  slug: "anillo-luna",
  description: "Plata 925",
  price: 80,
  compareAtPrice: 100,
  offerEndsAt: "2026-10-07T03:00:00.000Z",
  material: "Plata",
  category: { name: "Anillos", slug: "anillos" },
  images: [{ id: "i1", url: "https://cdn.test/a.jpg", position: 1 }],
  sizes: [],
  inStock: true,
};

describe("serializeJsonLd", () => {
  it("no permite cerrar el script desde los datos", () => {
    const html = serializeJsonLd({ name: "</script><script>alert(1)</script>&" });
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    expect(html).not.toContain("&");
    expect(JSON.parse(html)).toEqual({ name: "</script><script>alert(1)</script>&" });
  });
});

describe("productJsonLd", () => {
  it("usa el mismo precio vigente que la interfaz y la disponibilidad real", () => {
    const data = productJsonLd(product, business, siteUrl);
    expect(data).toMatchObject({
      "@type": "Product",
      url: "https://joyeria.test/productos/anillo-luna",
      image: ["https://cdn.test/a.jpg"],
      offers: {
        "@type": "Offer",
        price: "80.00",
        priceCurrency: "ARS",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2026-10-06",
      },
    });
    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("review");
  });

  it("sin oferta vigente no publica priceValidUntil; sin stock lo indica", () => {
    const data = productJsonLd(
      { ...product, price: 100, compareAtPrice: null, offerEndsAt: null, inStock: false },
      business,
      siteUrl,
    );
    expect(data.offers).toMatchObject({ availability: "https://schema.org/OutOfStock" });
    expect(data.offers).not.toHaveProperty("priceValidUntil");
  });

  it("sin forma de pedir (WhatsApp) o sin precio no declara Offer", () => {
    expect(productJsonLd(product, { ...business, whatsapp_number: " " }, siteUrl)).not.toHaveProperty(
      "offers",
    );
    expect(productJsonLd({ ...product, price: 0 }, business, siteUrl)).not.toHaveProperty("offers");
  });
});

describe("lastValidDate", () => {
  it("es el último día en la hora de la tienda", () => {
    expect(lastValidDate("2026-10-07T03:00:00.000Z")).toBe("2026-10-06");
    expect(lastValidDate("2026-10-07T03:00:00.001Z")).toBe("2026-10-07");
  });
});

describe("breadcrumbJsonLd y homeJsonLd", () => {
  it("arma URLs absolutas y posiciones correlativas", () => {
    expect(
      breadcrumbJsonLd(
        [
          { name: "Inicio", path: "/" },
          { name: "Anillos", path: "/categorias/anillos" },
        ],
        siteUrl,
      ),
    ).toMatchObject({
      itemListElement: [
        { position: 1, item: "https://joyeria.test/" },
        { position: 2, name: "Anillos", item: "https://joyeria.test/categorias/anillos" },
      ],
    });
  });

  it("no inventa datos del negocio que no están cargados", () => {
    const [organization] = homeJsonLd(business, siteUrl)["@graph"] as Record<string, unknown>[];
    expect(organization).toMatchObject({
      name: "Joyería Sol",
      sameAs: ["https://instagram.com/sol"],
      contactPoint: { telephone: "+5491100000000" },
    });
    expect(organization).not.toHaveProperty("address");
    expect(organization).not.toHaveProperty("logo");
    expect(organization).not.toHaveProperty("email");
  });
});
