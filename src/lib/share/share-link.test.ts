import { describe, expect, it, vi } from "vitest";
import { shareLink } from "./share-link";

const product = { title: "Anillo Luna", url: "https://joyeria.test/productos/anillo-luna" };

function abortError() {
  return Object.assign(new Error("Share canceled"), { name: "AbortError" });
}

describe("shareLink", () => {
  it("usa el compartir nativo con el nombre y la URL", async () => {
    const share = vi.fn(async () => {});
    const copy = vi.fn(async () => {});

    await expect(shareLink(product, { share, copy })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Anillo Luna",
      text: "Anillo Luna",
      url: "https://joyeria.test/productos/anillo-luna",
    });
    expect(copy).not.toHaveBeenCalled();
  });

  it("si el usuario cancela no copia ni informa error", async () => {
    const copy = vi.fn(async () => {});
    const result = await shareLink(product, {
      share: vi.fn(async () => Promise.reject(abortError())),
      copy,
    });

    expect(result).toBe("cancelled");
    expect(copy).not.toHaveBeenCalled();
  });

  it("sin compartir nativo copia el enlace", async () => {
    const copy = vi.fn(async () => {});

    await expect(shareLink(product, { copy })).resolves.toBe("copied");
    expect(copy).toHaveBeenCalledWith("https://joyeria.test/productos/anillo-luna");
  });

  it("si el dispositivo no puede compartir esos datos, copia", async () => {
    const share = vi.fn(async () => {});
    const result = await shareLink(product, {
      share,
      canShare: () => false,
      copy: vi.fn(async () => {}),
    });

    expect(result).toBe("copied");
    expect(share).not.toHaveBeenCalled();
  });

  it("si el compartir nativo falla por otro motivo, copia", async () => {
    const result = await shareLink(product, {
      share: vi.fn(async () => Promise.reject(new Error("NotAllowedError"))),
      copy: vi.fn(async () => {}),
    });

    expect(result).toBe("copied");
  });

  it("informa el fallo si tampoco se puede copiar", async () => {
    await expect(
      shareLink(product, { copy: vi.fn(async () => Promise.reject(new Error("denied"))) }),
    ).resolves.toBe("failed");
    await expect(shareLink(product, {})).resolves.toBe("failed");
  });
});
