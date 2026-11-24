// scripts/verify-epic1-frontend-cors.mjs
//
// Purpose: Read-only smoke test verifying that the running NestJS Platform
// Core backend exposes /health/db and permits CORS preflight requests from
// the metrix-core/frontend origin with RLS headers.
//
// Context: Validates cross-polyrepo readiness for Epic 1 (US-01.1 - US-01.5)
// without altering any backend source files or database state.
//
// Implementation Specs: Uses Node 22+ native fetch against BACKEND_API_URL
// (default http://localhost:4001/api/v1/core).

const baseUrl = (
  process.env.BACKEND_API_URL ?? "http://localhost:4001/api/v1/core"
).replace(/\/+$/, "");
const origin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

async function run() {
  const healthRes = await fetch(`${baseUrl}/health/db`);
  if (!healthRes.ok) {
    throw new Error(`GET /health/db failed with HTTP ${healthRes.status}`);
  }
  console.log("[PASS] GET /health/db ->", healthRes.status);

  const preflight = await fetch(`${baseUrl}/me/modules`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers":
        "Authorization,X-Tenant-Id,X-Organization-Id,Accept-Language",
    },
  });
  const allowOrigin = preflight.headers.get("access-control-allow-origin");
  if (!allowOrigin || (allowOrigin !== origin && allowOrigin !== "*")) {
    throw new Error(
      `CORS preflight rejected origin ${origin} (received: ${allowOrigin})`
    );
  }
  console.log("[PASS] CORS preflight allowed origin ->", allowOrigin);
}

run().catch((err) => {
  console.error("[FAIL]", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
