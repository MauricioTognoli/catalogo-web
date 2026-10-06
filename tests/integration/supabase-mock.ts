import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export const ANON_KEY = "anon-integration-key";
export const ACCESS_TOKEN_SUBJECT = "user-1";

export type MockProduct = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  material: string | null;
  available: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type MockOffer = {
  id: string;
  business_id: string;
  product_id: string;
  offer_price: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  featured: boolean;
};

export type MockState = {
  business: Record<string, unknown>;
  categories: Record<string, unknown>[];
  products: MockProduct[];
  offers: MockOffer[];
};

export type MockRequest = { method: string; table: string; search: string; anon: boolean };

type Row = Record<string, unknown>;

function isActive(offer: MockOffer, now: number) {
  return offer.enabled && Date.parse(offer.starts_at) <= now && now < Date.parse(offer.ends_at);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

function matches(row: Row, key: string, raw: string): boolean {
  const [operator, ...rest] = raw.split(".");
  const expected = rest.join(".");
  const path = key.split(".");
  let value: unknown = row;
  for (const part of path) value = (value as Row | null)?.[part];
  if (operator === "eq") return String(value) === expected;
  if (operator === "ilike") {
    const needle = expected.replaceAll("*", "").replaceAll("%", "").toLowerCase();
    return String(value).toLowerCase().includes(needle);
  }
  return true;
}

export function startSupabaseMock(state: MockState) {
  const requests: MockRequest[] = [];

  function productView(product: MockProduct, anon: boolean, now: number): Row {
    const category = state.categories.find((item) => item.id === product.category_id);
    return {
      ...product,
      category: category ? { name: category.name, slug: category.slug } : null,
      product_image: [],
      product_size: [],
      product_offer: state.offers.filter(
        (offer) =>
          offer.product_id === product.id &&
          (!anon || (isActive(offer, now) && product.available)),
      ),
    };
  }

  function rows(table: string, anon: boolean, now: number): Row[] {
    switch (table) {
      case "business":
        return [state.business];
      case "category":
        return state.categories;
      case "product":
        return state.products
          .filter((product) => !anon || product.available)
          .map((product) => productView(product, anon, now));
      case "product_offer":
        return state.offers
          .filter((offer) => {
            if (!anon) return true;
            const product = state.products.find((item) => item.id === offer.product_id);
            return isActive(offer, now) && product?.available === true;
          })
          .map((offer) => ({
            ...offer,
            product: productView(
              state.products.find((item) => item.id === offer.product_id)!,
              anon,
              now,
            ),
          }));
      default:
        return [];
    }
  }

  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://mock");
    const now = Date.now();
    const authorization = request.headers.authorization ?? "";
    const anon = authorization === `Bearer ${ANON_KEY}` || authorization === "";
    const send = (status: number, body?: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(body === undefined ? "" : JSON.stringify(body));
    };

    if (url.pathname === "/auth/v1/user") {
      if (anon) return send(401, { message: "invalid token" });
      return send(200, {
        id: ACCESS_TOKEN_SUBJECT,
        aud: "authenticated",
        role: "authenticated",
        email: "owner@test.local",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date(0).toISOString(),
      });
    }

    const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (!match) return send(404, { message: "not found" });
    const table = match[1];
    requests.push({ method: request.method ?? "GET", table, search: url.search, anon });

    const filters = [...url.searchParams.entries()].filter(
      ([key]) => !["select", "order", "limit", "offset", "columns"].includes(key),
    );
    let result = rows(table, anon, now).filter((row) =>
      filters.every(([key, value]) => matches(row, key, value)),
    );

    if (request.method === "PATCH") {
      const patch = JSON.parse((await readBody(request)) || "{}") as Row;
      const ids = new Set(result.map((row) => row.id));
      const source =
        table === "product" ? state.products : table === "product_offer" ? state.offers : [];
      for (const item of source as Row[]) {
        if (ids.has(item.id)) Object.assign(item, patch);
      }
      return send(204);
    }

    const limit = url.searchParams.get("limit");
    if (limit) result = result.slice(0, Number(limit));

    if ((request.headers.accept ?? "").includes("vnd.pgrst.object")) {
      return result.length === 1 ? send(200, result[0]) : send(406, { message: "not single" });
    }
    return send(200, result);
  });

  return new Promise<{ url: string; requests: MockRequest[]; close: () => Promise<void> }>(
    (resolve) => {
      server.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        resolve({
          url: `http://localhost:${port}`,
          requests,
          close: () => new Promise((done) => server.close(() => done())),
        });
      });
    },
  );
}
