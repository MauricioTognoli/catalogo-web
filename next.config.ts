import type { NextConfig } from "next";

function getSupabaseHostname(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las imágenes de producto viajan como multipart/form-data a través
      // de una Server Action; el límite por defecto (1MB) no alcanza para
      // el máximo de 5MB por archivo definido en actions/productImages.ts.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
