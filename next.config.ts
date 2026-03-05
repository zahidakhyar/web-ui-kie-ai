import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // Cloudflare R2 default public domain
      { protocol: "https", hostname: "*.r2.dev" },
      // KIE.ai result CDN (wildcard covers any subdomain)
      { protocol: "https", hostname: "*.kie.ai" },
    ],
  },
};

export default nextConfig;
