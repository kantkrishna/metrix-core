// metrix-core/frontend/next.config.ts
/*
Purpose: Configures the Next.js App Router runtime, standalone production bundle,
and baseline HTTP security headers for METRix Platform Core.

Context: Supports multi-stage Docker container builds and enterprise security
headers aligned with METRix-HLD-Concise-20261122.md.

Implementation Specs: Enables reactStrictMode, standalone output, and strict
clickjacking/MIME-sniffing headers on all routes.
*/

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
