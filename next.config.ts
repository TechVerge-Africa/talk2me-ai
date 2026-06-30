import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: hide Next.js from response headers
  poweredByHeader: false,

  // Performance: gzip/brotli compress all responses
  compress: true,

  // Performance: tree-shake heavy packages to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "@livekit/components-react",
      "livekit-client",
      "framer-motion",
      "lucide-react",
    ],
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Prevent image endpoint abuse
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; sandbox;",
  },

  // Strict headers applied at Next.js level (supplement vercel.json)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
