import { describe, expect, it } from "vitest";
import { imageSrcKey, resolveImageStatus } from "./load-status";

describe("resolveImageStatus", () => {
  it("arranca cargando", () => {
    expect(resolveImageStatus(null, "/a.jpg")).toBe("loading");
  });

  it("refleja la carga y el error de la misma imagen", () => {
    expect(resolveImageStatus({ src: "/a.jpg", status: "loaded" }, "/a.jpg")).toBe("loaded");
    expect(resolveImageStatus({ src: "/a.jpg", status: "error" }, "/a.jpg")).toBe("error");
  });

  it("si cambia la imagen vuelve a cargando, aunque la anterior haya fallado", () => {
    expect(resolveImageStatus({ src: "/a.jpg", status: "loaded" }, "/b.jpg")).toBe("loading");
    expect(resolveImageStatus({ src: "/a.jpg", status: "error" }, "/b.jpg")).toBe("loading");
  });
});

describe("imageSrcKey", () => {
  it("acepta URLs e imágenes importadas", () => {
    expect(imageSrcKey("/a.jpg")).toBe("/a.jpg");
    expect(imageSrcKey({ src: "/b.jpg" })).toBe("/b.jpg");
    expect(imageSrcKey({ default: { src: "/c.jpg" } })).toBe("/c.jpg");
  });
});
