import type { NextConfig } from "next";

// Where this Next server should forward /api/v1 and /storage.
// Local dev: the uvicorn process on the host. In docker-compose: the backend
// service on the compose network. Nginx routes those paths straight to the
// backend in production, so these rewrites are only a dev-time convenience —
// but they must not stay hardcoded to 127.0.0.1 or the container proxies to
// itself and every API call 502s.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Self-contained server bundle — what frontend/Dockerfile's runner stage copies.
  output: "standalone",
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${BACKEND_ORIGIN}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
