import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ai-images.hasuka-project.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
