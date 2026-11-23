# Advantax Tax METRix — Platform Core Service Foundation (v1.0)

Production-ready **NestJS 12 + PostgreSQL 16 + Drizzle ORM + FORCE RLS + OpenAPI 3.1 + Vitest/Testcontainers** integration package covering all 10 Platform Core journeys.

## Quickstart (Windows PowerShell)
```powershell
Copy-Item .env.example .env
npm install
npm run docker:up
npm run db:bootstrap
npm run verify:all
npm run start:dev
Invoke-RestMethod http://localhost:4001/api/v1/core/health/db | ConvertTo-Json -Depth 5
```

## Quickstart (macOS / Linux)
```bash
cp .env.example .env
npm install
npm run docker:up
npm run db:bootstrap
npm run verify:all
npm run start:dev
curl -s http://localhost:4001/api/v1/core/health/db | jq .
```

## Verification Scripts
- `npm run typecheck` — Strict TypeScript compilation check.
- `npm run openapi:validate` — Validates OpenAPI 3.1.0, 63 paths, 74 ops, 100% `$ref` resolution & 30-enum Drizzle/Zod parity.
- `npm run test:unit` — Runs contract & unit test suites (no Docker required).
- `npm run test:integration` — Boots ephemeral PostgreSQL 16 via Testcontainers to prove schema integrity, idempotent seeding, CA Firm multi-client RLS isolation, cross-tenant block, pool reset & audit immutability.
