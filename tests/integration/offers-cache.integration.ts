import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/utils/formatPrice";
import {
  ACCESS_TOKEN_SUBJECT,
  ANON_KEY,
  startSupabaseMock,
  type MockOffer,
  type MockProduct,
  type MockState,
} from "./supabase-mock";

const ROOT = path.resolve(__dirname, "../..");
const DIST_DIR = ".next-integration";
const PORT = 3311;
const BASE = `http://localhost:${PORT}`;
const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");
const OFFER_WINDOW_MS = 20_000;
const HOUR_MS = 60 * 60 * 1000;

const created = new Date("2026-10-01T00:00:00.000Z").toISOString();

function product(id: string, slug: string, price: number): MockProduct {
  return {
    id,
    business_id: "biz",
    category_id: "cat",
    name: `Producto ${slug}`,
    slug,
    description: `Descripción de ${slug}`,
    price,
    material: null,
    available: true,
    in_stock: true,
    created_at: created,
    updated_at: created,
  };
}

function offer(id: string, productId: string, offerPrice: number, startsAt: number, endsAt: number): MockOffer {
  return {
    id,
    business_id: "biz",
    product_id: productId,
    offer_price: offerPrice,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    enabled: true,
    featured: false,
  };
}

const state: MockState = {
  business: {
    id: "biz",
    owner_id: ACCESS_TOKEN_SUBJECT,
    name: "Joyería Test",
    slug: "joyeria-test",
    logo_url: null,
    whatsapp_number: "5491100000000",
    email: null,
    address: null,
    instagram_url: null,
    created_at: created,
    updated_at: created,
  },
  categories: [
    { id: "cat", business_id: "biz", name: "Anillos", slug: "anillos", position: 0, updated_at: created },
  ],
  products: [
    product("p-end", "anillo-fin", 100),
    product("p-start", "anillo-inicio", 200),
    product("p-hide", "anillo-oculto", 300),
  ],
  offers: [],
};

let mock: Awaited<ReturnType<typeof startSupabaseMock>>;
let server: ChildProcess | undefined;

function env() {
  return {
    ...process.env,
    NEXT_DIST_DIR: DIST_DIR,
    NEXT_TSCONFIG_PATH: "tsconfig.integration.json",
    NEXT_PUBLIC_SUPABASE_URL: mock.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
    NEXT_PUBLIC_SITE_URL: "https://tienda.test",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NEXT_BIN, ...args], { cwd: ROOT, env: env() });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`next ${args[0]} falló:\n${output}`)),
    );
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`${BASE}/robots.txt`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("El servidor no arrancó");
}

const sleepUntil = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, time - Date.now())));

type Page = { status: number; visible: string; jsonLd: Record<string, unknown>[]; meta: string };

async function get(pathname: string): Promise<Page> {
  const response = await fetch(`${BASE}${pathname}`);
  const html = await response.text();
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]) as Record<string, unknown>,
  );
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
  const head = html.match(/<head>[\s\S]*?<\/head>/)?.[0] ?? "";
  const meta = [...head.matchAll(/<title>([^<]*)<\/title>|<meta [^>]*content="([^"]*)"/g)].map(
    (match) => match[1] ?? match[2],
  );
  return { status: response.status, visible, jsonLd, meta: meta.join(" | ") };
}

function offerPrice(page: Page): string | undefined {
  const productLd = page.jsonLd.find((item) => item["@type"] === "Product");
  return (productLd?.offers as { price?: string } | undefined)?.price;
}

function shows(page: Page, price: number) {
  return page.visible.includes(formatPrice(price));
}

function findActionId(exportName: string): string {
  const manifest = JSON.parse(
    readFileSync(path.join(ROOT, DIST_DIR, "server/server-reference-manifest.json"), "utf8"),
  ) as { node: Record<string, { exportedName?: string; filename?: string }> };
  const entry = Object.entries(manifest.node).find(
    ([, value]) => value.exportedName === exportName && value.filename?.includes("actions/products"),
  );
  if (!entry) throw new Error(`No se encontró la acción ${exportName}`);
  return entry[0];
}

function ownerCookie(): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({ sub: ACCESS_TOKEN_SUBJECT, exp: expiresAt, role: "authenticated", aud: "authenticated" }),
    "firma",
  ].join(".");
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "refresh",
    user: { id: ACCESS_TOKEN_SUBJECT, aud: "authenticated", role: "authenticated" },
  };
  return `sb-localhost-auth-token=base64-${encode(session)}`;
}

async function callProductAction(exportName: string, fields: Record<string, string>) {
  const { encodeReply } = createRequire(import.meta.url)(
    "next/dist/compiled/react-server-dom-turbopack/client.node.js",
  ) as { encodeReply: (value: unknown) => Promise<FormData | string> };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  const body = await encodeReply([{ error: null }, formData]);
  const response = await fetch(`${BASE}/`, {
    method: "POST",
    headers: {
      "Next-Action": findActionId(exportName),
      Origin: BASE,
      Cookie: ownerCookie(),
      Accept: "text/x-component",
    },
    body,
  });
  return { status: response.status, text: await response.text() };
}

beforeAll(async () => {
  const now = Date.now();
  state.offers = [
    offer("o-end", "p-end", 80, now - HOUR_MS, now + 2 * HOUR_MS),
    offer("o-start", "p-start", 150, now + 2 * HOUR_MS, now + 3 * HOUR_MS),
  ];
  mock = await startSupabaseMock(state);
  await run(["build"]);
  server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], {
    cwd: ROOT,
    env: env(),
    stdio: "ignore",
  });
  await waitForServer();
}, 600_000);

afterAll(async () => {
  server?.kill();
  await mock?.close();
});

describe("ofertas temporales con la tienda en caché", () => {
  it("una oferta que vence sin edición del panel deja de verse en la petición siguiente", async () => {
    const start = Date.now();
    state.offers[0].ends_at = new Date(start + OFFER_WINDOW_MS).toISOString();

    for (let attempt = 0; attempt < 2; attempt++) {
      const before = await get("/productos/anillo-fin");
      expect(before.status).toBe(200);
      expect(shows(before, 80)).toBe(true);
      expect(offerPrice(before)).toBe("80.00");
    }
    expect(shows(await get("/categorias/anillos"), 80)).toBe(true);

    await sleepUntil(start + OFFER_WINDOW_MS + 1_000);

    const after = await get("/productos/anillo-fin");
    expect(after.status).toBe(200);
    expect(shows(after, 80)).toBe(false);
    expect(shows(after, 100)).toBe(true);
    expect(offerPrice(after)).toBe("100.00");
    expect(after.meta).toContain("Producto anillo-fin");
    expect(after.meta).not.toMatch(/80[.,]00/);

    const category = await get("/categorias/anillos");
    expect(shows(category, 80)).toBe(false);
    expect(shows(category, 100)).toBe(true);

    const home = await get("/");
    expect(shows(home, 80)).toBe(false);
  }, 120_000);

  it("una oferta programada empieza a verse en la petición siguiente a su inicio", async () => {
    const start = Date.now();
    state.offers[1].starts_at = new Date(start + OFFER_WINDOW_MS).toISOString();

    for (let attempt = 0; attempt < 2; attempt++) {
      const before = await get("/productos/anillo-inicio");
      expect(shows(before, 150)).toBe(false);
      expect(offerPrice(before)).toBe("200.00");
    }

    await sleepUntil(start + OFFER_WINDOW_MS + 1_000);

    const after = await get("/productos/anillo-inicio");
    expect(shows(after, 150)).toBe(true);
    expect(offerPrice(after)).toBe("150.00");
    expect(after.meta).toContain("Producto anillo-inicio");
    expect(after.meta).not.toMatch(/(150|200)[.,]00/);
    expect(shows(await get("/categorias/anillos"), 150)).toBe(true);
  }, 120_000);

  it("ocultar desde el panel un producto ya cacheado devuelve 404 en la petición siguiente", async () => {
    expect((await get("/productos/anillo-oculto")).status).toBe(200);
    expect((await get("/productos/anillo-oculto")).status).toBe(200);

    state.products.find((item) => item.id === "p-hide")!.available = false;
    const cached = await get("/productos/anillo-oculto");
    expect(cached.status).toBe(200);
    expect(shows(cached, 300)).toBe(true);

    const action = await callProductAction("toggleProductAvailability", {
      productId: "p-hide",
      available: "false",
    });
    expect(action.status).toBe(200);
    expect(state.products.find((item) => item.id === "p-hide")?.available).toBe(false);

    expect((await get("/productos/anillo-oculto")).status).toBe(404);
    expect(shows(await get("/categorias/anillos"), 300)).toBe(false);
  }, 60_000);
});
