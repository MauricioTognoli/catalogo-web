import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAG } from "@/lib/catalog/cache";

export const catalogFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
  });

const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

function createAnonClient(fetchImpl: typeof fetch): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetchImpl },
    },
  );
}

let cachedClient: SupabaseClient | null = null;
let liveClient: SupabaseClient | null = null;

export function createPublicClient({ cached = true }: { cached?: boolean } = {}) {
  if (cached) {
    cachedClient ??= createAnonClient(catalogFetch);
    return cachedClient;
  }
  liveClient ??= createAnonClient(uncachedFetch);
  return liveClient;
}
