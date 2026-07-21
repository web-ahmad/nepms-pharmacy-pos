import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Commented out for local development
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*', // Proxy to Backend
      },
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:8000/storage/:path*', // Proxy for images
      },
    ];
  },
};

export default nextConfig;
