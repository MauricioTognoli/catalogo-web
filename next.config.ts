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
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: { tsconfigPath: process.env.NEXT_TSCONFIG_PATH || "tsconfig.json" },
  allowedDevOrigins: ["192.168.1.155"],
  // Todo el panel (login, admin, vista previa de borradores, descargas y
  // route handlers sin HTML) queda fuera de los buscadores aunque algún
  // enlace lo exponga. Las páginas además lo declaran en su metadata.
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Las imágenes de producto viajan como multipart/form-data a través
      // de una Server Action; el límite por defecto (1MB) no alcanza para
      // el máximo de 5MB por archivo definido en actions/productImages.ts.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
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
