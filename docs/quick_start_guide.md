# Running `metrix-core` (Backend + Frontend)

Run all commands from the repository root:

```powershell
Set-Location C:\Users\kantk\vscode-projects\terracell\METRix\repos\metrix-core
```

---

## Mode 1: Local Development (Hot-Reload Backend + Frontend, Dockerized Postgres & Redis)

Best for active coding with instant NestJS watch reload and Next.js Fast Refresh.

```powershell
# 1. Start PostgreSQL 16 and Redis 7 containers
npm run infra:up

# 2. (First time only, or after DB schema/seed changes) Push schema, apply 21 FORCE RLS policies & seed
npm run db:bootstrap

# 3. Start both backend (:4001) and frontend (:3000) concurrently
npm run dev
```

**To stop:** Press `Ctrl+C` in the terminal running `npm run dev`, then run:

```powershell
npm run infra:down
```

---

## Mode 2: Full Docker Stack (All Services in Containers)

Best for running the complete production-like stack (`postgres`, `redis`, `api`, `platform-core-frontend`).

```powershell
# First time (or on a fresh DB volume — runs one-shot db-bootstrap before starting API)
npm run docker:up:bootstrap

# Subsequent restarts (reuses local images, skips db-bootstrap)
npm run docker:up

# After changing backend/ or frontend/ code or dependencies (rebuilds container images)
npm run docker:up:build
```

**Inspect status, logs, or stop:**

```powershell
npm run docker:ps
npm run docker:logs
npm run docker:down
```

*(Need a completely wiped & re-seeded Docker DB? Run `npm run docker:reset`.)*

---

## Mode 3: Local Production Build (Non-Docker App Processes)

```powershell
npm run infra:up
npm run build
npm run start
```

---

## App URLs & Quick Health Check

* **Frontend UI:** `http://localhost:3000/login`
* **Backend API Base:** `http://localhost:4001/api/v1/core`

```powershell
# Verify backend DB role (metrix_app / NOBYPASSRLS / 21 FORCE RLS tables) & frontend HTTP 200
Invoke-RestMethod http://localhost:4001/api/v1/core/health/db | ConvertTo-Json -Depth 5
(Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing).StatusCode
```