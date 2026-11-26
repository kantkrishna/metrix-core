// frontend/next.config.ts
/*
Purpose: Configures the Next.js App Router runtime, standalone production bundle,
Turbopack workspace root, and baseline HTTP security headers for METRix Platform
Core.

Context: Supports multi-stage Docker container builds and lightweight polyrepo
execution (independent frontend/package-lock.json) without Turbopack root
inference warnings.

Implementation Specs: Enables reactStrictMode, standalone output, explicit
turbopack.root & outputFileTracingRoot pinned to frontend/, and security headers.
*/

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

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
  outputFileTracingRoot: frontendRoot,
  turbopack: {
    root: frontendRoot,
  },
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
