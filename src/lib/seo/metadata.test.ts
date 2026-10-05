import { describe, expect, it } from "vitest";
import { firstPresent, logoShareImage, pageMetadata, toDescription } from "./metadata";
import { getSiteUrl } from "./site-url";

describe("toDescription", () => {
  it("normaliza espacios y saltos de línea", () => {
    expect(toDescription("  Anillo \n de  oro  ")).toBe("Anillo de oro");
  });

  it("vacío o null devuelve null (para usar un texto alternativo)", () => {
    expect(toDescription("   ")).toBeNull();
    expect(toDescription(null)).toBeNull();
  });

  it("corta en una palabra, sin puntuación colgando, y agrega …", () => {
    const text = "Anillo solitario de oro 18k con circón central, ideal para compromiso y regalos.";
    const result = toDescription(text, 40)!;
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result).toBe("Anillo solitario de oro 18k con circón…");
  });
});

describe("firstPresent", () => {
  it("devuelve la primera opción disponible", () => {
    expect(firstPresent(null, undefined, "b", "c")).toBe("b");
    expect(firstPresent(null, undefined)).toBeNull();
  });
});

describe("pageMetadata", () => {
  const base = {
    title: "Anillo Luna",
    description: "Plata 925.",
    path: "/productos/anillo-luna",
    siteName: "Joyería Sol",
  };

  it("con imagen: og:image y tarjeta grande", () => {
    const metadata = pageMetadata({
      ...base,
      image: { url: "https://cdn.test/a.jpg", alt: "Anillo Luna" },
    });
    expect(metadata.alternates).toEqual({ canonical: "/productos/anillo-luna" });
    expect(metadata.openGraph).toMatchObject({
      url: "/productos/anillo-luna",
      title: "Anillo Luna · Joyería Sol",
      images: [{ url: "https://cdn.test/a.jpg", alt: "Anillo Luna" }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("sin imagen: no inventa og:image y usa tarjeta chica", () => {
    const metadata = pageMetadata({ ...base, image: null });
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).toMatchObject({ card: "summary" });
    expect(metadata.twitter).not.toHaveProperty("images");
  });

  it("con el logo como única imagen: og:image pero tarjeta chica", () => {
    const metadata = pageMetadata({
      ...base,
      image: logoShareImage({ name: "Joyería Sol", logo_url: "https://cdn.test/logo.png" }),
    });
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: "https://cdn.test/logo.png", alt: "Logo de Joyería Sol" }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary" });
    expect(logoShareImage({ name: "Joyería Sol", logo_url: null })).toBeNull();
  });

  it("con medidas: las publica en og:image", () => {
    const metadata = pageMetadata({
      ...base,
      image: { url: "/og-image.jpg", alt: "Joyería Sol", width: 1200, height: 630 },
    });
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: "/og-image.jpg", alt: "Joyería Sol", width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/og-image.jpg"],
    });
  });

  it("título absoluto para el inicio (sin repetir el nombre)", () => {
    const metadata = pageMetadata({ ...base, title: "Joyería Sol", image: null, absoluteTitle: true });
    expect(metadata.title).toEqual({ absolute: "Joyería Sol" });
    expect(metadata.openGraph).toMatchObject({ title: "Joyería Sol" });
  });
});

describe("getSiteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL y se queda solo con el origen", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://joyeria.com.ar/tienda/" }).href).toBe(
      "https://joyeria.com.ar/",
    );
  });

  it("cae al dominio de Vercel (sin protocolo) y después a localhost", () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "joyeria.vercel.app" }).href).toBe(
      "https://joyeria.vercel.app/",
    );
    expect(getSiteUrl({}).href).toBe("http://localhost:3000/");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "::no válida::" }).href).toBe(
      "http://localhost:3000/",
    );
  });
});
