# Running Advantax Tax METRix Platform Core in Docker

This Docker overlay containerizes the **NestJS Platform Core Service** alongside **PostgreSQL 16** and **Redis 7**, with an optional `bootstrap` profile for one-shot Drizzle schema push, 21 `FORCE ROW LEVEL SECURITY` policies, and idempotent seed verification.

## Container Architecture

| Service | Image / Target | Profile | Role & Security Boundary | Port |
| :--- | :--- | :--- | :--- | :--- |
| `postgres` | `postgres:16-alpine` | default | Auto-provisions `metrix_owner` (DDL) and `metrix_app` (`NOSUPERUSER NOBYPASSRLS`) | `5432` |
| `redis` | `redis:7-alpine` | default | AOF cache for App Shell `GET /me/modules` manifest & BullMQ queues | `6379` |
| `db-bootstrap` | `Dockerfile` (`target: migrator`) | `bootstrap` | Opt-in one-shot container running `npm run db:bootstrap` (`db:push` + `db:migrate:rls` + `db:seed`), then exits `0` | — |
| `api` | `Dockerfile` (`target: runner`) | default | Non-root `USER node` running `node dist/main.js` using **only** `metrix_app` (`NOBYPASSRLS`) | `4001` |

## `package.json` Script Configuration

Add these scripts under `"scripts"` in `backend/package.json`:

```json
"docker:up": "docker compose up -d --build",
"docker:up:bootstrap": "docker compose --profile bootstrap up -d --build",
"docker:bootstrap": "docker compose --profile bootstrap run --rm db-bootstrap",
"docker:dev": "docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build",
"docker:dev:bootstrap": "docker compose --profile bootstrap -f docker-compose.yml -f docker-compose.dev.yml up --build",
"docker:infra": "docker compose up -d postgres redis",
"docker:down": "docker compose --profile bootstrap down",
"docker:reset": "docker compose --profile bootstrap down -v && npm run docker:up:bootstrap",
"docker:logs": "docker compose logs -f api"
```

## Quick Start (PowerShell)

```powershell
# 1. Extract metrix-core-backend-docker.zip into metrix-core/
Expand-Archive -Path .\metrix-core-backend-docker.zip -DestinationPath . -Force
Set-Location .\backend

# 2. First-time start (or after schema/RLS edits) — WITH db-bootstrap:
npm run docker:up:bootstrap

# 3. Everyday start / API rebuild — WITHOUT db-bootstrap:
npm run docker:up

# 4. Verify live health probe & NOBYPASSRLS runtime enforcement:
Invoke-RestMethod http://localhost:4001/api/v1/core/health/db | ConvertTo-Json -Depth 5
```

## Hot-Reload Development & Maintenance

```powershell
# Hot-reload in Docker (without or with db-bootstrap):
npm run docker:dev
npm run docker:dev:bootstrap

# Run only db-bootstrap once on demand (auto-removes container):
npm run docker:bootstrap

# Start only Postgres & Redis (debug NestJS locally on host):
npm run docker:infra

# Stop all containers / wipe volume and cleanly re-bootstrap:
npm run docker:down
npm run docker:reset
```
