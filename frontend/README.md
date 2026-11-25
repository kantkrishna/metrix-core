# METRix Platform Core Service — React Frontend (`metrix-core/frontend`)

Production Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 (`@theme inline`) / Zod v4 / `shadcn/ui` frontend scaffold for the **METRix Platform Core Service**, ready for strict TDD implementation of **Epic 1 (`EP-01`)**.

## Architecture & Source Alignment
- **Requirements & Backlog:** `requirements.md` (`EP-01` – `EP-10`, `FR-CORE-001` – `FR-CORE-040`, `BR-001` – `BR-023`)
- **HLD:** `METRix-HLD-Concise-20261122.md`
- **API Contract:** `openapi-platform-core-v1.yaml` (30 enums, RFC 9457 errors, `X-Tenant-Id` / `X-Organization-Id` RLS headers, `GET /api/v1/core/me/modules`)
- **Design Tokens:** `design-tokens.tokens.json` (76 Light `:root` & Dark `.dark` `@theme inline` variables)

## Directory Structure
```text
metrix-core/frontend/
├── src/
│   ├── app/                # Next.js App Router (globals.css, layout.tsx, page.tsx)
│   ├── components/ui/      # shadcn/ui primitives (Button, StatusBadge, Card, Skeleton)
│   ├── config/             # Zod v4-validated runtime environment (env.ts)
│   ├── contracts/          # 30 OpenAPI enums, RFC 9457 ProblemDetails, Epic 1 Zod v4 DTOs
│   ├── i18n/               # BCP-47 I18N provider & externalized en-IN message bundle
│   ├── lib/                # RLS HTTP client, Decimal.js formatters, cn() helper
│   └── providers/          # ThemeProvider (Light/Dark/System) & TanStack Query providers
├── tests/
│   ├── unit/               # Vitest 5 + React Testing Library TDD suite
│   ├── e2e/                # Playwright browser tests (1440px & 900px)
│   └── bdd/                # Cucumber.js 13 + Gherkin acceptance tests
├── Dockerfile              # Non-root multi-stage standalone Node 24 container
└── docker-compose.yml      # Local container build/start/stop verification
```

## Local Setup & Verification (PowerShell)

```
Set-Location .\metrix-core\frontend

# 1. RED PHASE — After creating Section 2 test files (before Section 3 code):
npm run test:unit
# Expected: FAIL on missing module imports for Epic 1 features

# 2. GREEN & REFACTOR PHASE — After creating Section 3 files:
npm run typecheck
npm run lint
npm run test:unit
npm run test:bdd
npm run build
npm run verify:all

# 3. Playwright E2E Verification (in a second terminal while dev/start runs):
# Terminal A:
npm run dev
# Terminal B:
npm run test:e2e

# 4. Docker Container Build, Start, Stop, Restart Verification:
docker compose build
docker compose up -d
docker compose ps
docker compose restart
docker compose ps
docker compose down
```