# Advantax Tax METRix — Platform Core Integration & Verification Guide (v1.1)

## 1. Prerequisites
- **Node.js** `>= 20.11.0` and **npm** `>= 10.0.0`
- **Docker Desktop** (PostgreSQL 16 + Redis 7 local containers and Testcontainers integration suite)
- No local `psql` installation required (`scripts/apply-rls.ts` executes SQL directly via `pg`)

## 2. Step-by-Step Repository Setup & Verification

### Windows PowerShell
```powershell
Copy-Item .env.example .env
npm install
npm audit
npm run docker:up
npm run db:bootstrap
npm run verify:all
npm run start:dev
# In a second terminal:
Invoke-RestMethod http://localhost:4001/api/v1/core/health/db | ConvertTo-Json -Depth 5
```

### macOS / Linux
```bash
cp .env.example .env
npm install
npm audit
npm run docker:up
npm run db:bootstrap
npm run verify:all
npm run start:dev
curl -s http://localhost:4001/api/v1/core/health/db | jq .
```

## 3. Architecture & Schema Guarantees
- **24 PostgreSQL tables & 30 enums** strictly isolated inside schema `core`, with `NOT NULL` `created_by` / `updated_by` audit columns and `TIMESTAMPTZ` / `DATE` / `TIME` precision discipline.
- **21 `FORCE ROW LEVEL SECURITY` tables** enforced under non-superuser `metrix_app` (`NOBYPASSRLS`) using transaction-local `SET LOCAL` variables via `withRlsContext()`.
- **2 `security_invoker = true` views** (`v_tenant_quota_utilization` & `v_effective_user_org_permissions`).
- **Statement-level append-only trigger** (`trg_audit_logs_immutable`) blocking `UPDATE`, `DELETE`, and `TRUNCATE` on `core.audit_logs`.
- **OpenAPI 3.1.0 Contract (`openapi/openapi-platform-core-v1.yaml`)**: 64 paths, 75 unique operations (including `GET /api/v1/core/me/modules` App Shell manifest), 30/30 enum parity, `Decimal.js` `NUMERIC(14,2)` wire strings, and RFC 9457 `ProblemDetails`.

## 4. Explicit Assumptions & Outstanding Dependencies
1. **ORM Selection (GAP-PC-001):** Drizzle ORM (`0.45.4`) is implemented for Platform Core with PostgreSQL `FORCE RLS`; formalize via ADR alongside HLD v1.1.
2. **Domain Controllers:** Phase 3 delivers the database foundation, RLS guard, RFC 9457 filter, Zod DTOs, OpenAPI 3.1 contract, health endpoint, and full automated test harness. Implementing the NestJS business controllers for Journeys 1–10 (including Redis-cached `GET /me/modules`) is the next sprint deliverable.
3. **External Infrastructure:** Managed OIDC JWKS endpoint, AWS SES/SMTP credentials, S3 object storage for large audit exports, and OpenTelemetry OTLP collector are externally provisioned and configured via `.env`.
