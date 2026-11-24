# METRix Platform Core Service — Epic 1 (`EP-01`) Functional Testing Guide

**Scope:** `US-01.1` (Delegated OIDC Auth & Workspace Picker), `US-01.2` (Executive Health Dashboard), `US-01.3` (Collapsible/Pinnable Left Nav & Light/Dark/System Theme), `US-01.4` (Unified Module Switcher), and `US-01.5` (Graceful Org-Level Module Fallback).  
**Target Directories:** `metrix-core/frontend/` (Next.js 16 on `http://localhost:3000`) & `metrix-core/backend/` (NestJS on `http://localhost:4001/api/v1/core`).

---

## 1. Environment Startup & Prerequisites

### 1.1 Start the Backend (Optional if testing Full Stack)
If you want to test against live PostgreSQL + NestJS APIs:

```powershell
# Terminal 1 — metrix-core/backend
Set-Location .\metrix-core\backend
docker compose up -d
npm run start:dev

# Verify DB health and frontend CORS preflight
node .\scripts\verify-epic1-frontend-cors.mjs
```

### 1.2 Start the Frontend
```powershell
# Terminal 2 — metrix-core/frontend
Set-Location .\metrix-core\frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```
Open `http://localhost:3000` in Chrome or Edge (keep DevTools → **Network** and **Application → Storage** open during manual checks).

---

## 2. Gate 1 — Automated Functional & Acceptance Test Suites

Run these commands inside `metrix-core\frontend` first to verify all unit, component, BDD, and browser E2E checks:

```powershell
# 1. Typecheck + ESLint + Vitest unit/component tests + Next.js production build
npm run verify:all

# 2. Cucumber.js Gherkin BDD acceptance scenarios (3 scenarios)
npm run test:bdd

# 3. Playwright browser E2E tests (1440px desktop & 900px tablet; requires npm run dev running)
npm run test:e2e

# 4. Production Docker container lifecycle check
docker compose build
docker compose up -d
docker compose ps
docker compose restart
docker compose down
```

**Pass Criteria:** 0 TypeScript errors, 0 ESLint warnings/errors, all Vitest suites green, 3/3 Cucumber.js BDD scenarios passed, 2/2 Playwright projects passed, and Docker container starts/restarts cleanly on port `3000`.

---

## 3. Gate 2 — Manual Functional Test Cases (Story by Story)

> **Tip (Testing Without a Live External OIDC IdP):** If your managed OIDC provider is not yet connected locally, you can simulate an authenticated browser session in DevTools Console to test `US-01.2`–`US-01.5`, or use Chrome DevTools **Network → Request Blocking / Local Overrides** to test 503/403 error paths.

---

### `US-01.1` — Delegated OIDC Sign-In & Multi-Tenant Workspace Selection

| Case ID | Scenario | Steps | Expected Functional Result |
| :--- | :--- | :--- | :--- |
| **TC-01.1a** | Unauthenticated Route Protection | Clear `sessionStorage` and navigate directly to `http://localhost:3000/` and `http://localhost:3000/dashboard`. | Both immediately redirect to `/login`; zero protected dashboard data renders. |
| **TC-01.1b** | Zero Password Capture (`BR-004`) | On `/login`, inspect the form inputs and DOM. | Only **Tenant Workspace Identifier (Optional)** and **Work Email** appear. Zero `input[type="password"]` fields exist. |
| **TC-01.1c** | OIDC Discovery & PKCE Redirect | Enter slug `meridian-infra` and email `vikram.desai@meridian.in`, then click **Continue with Enterprise SSO (OIDC)**. | Network tab shows `POST /api/v1/core/auth/oidc/discover`. `sessionStorage` stores `metrix.oidc.state` and `metrix.oidc.verifier`. Browser redirects to the returned `authorizationUrl` with `?state=...`. |
| **TC-01.1d** | Single-Tenant Callback Landing | Complete callback `/auth/callback?code=...&state=...` for a user belonging to 1 tenant. | `POST /auth/oidc/callback` succeeds, `metrix.oidc.*` ephemeral keys are removed, and user lands directly on `/dashboard` without seeing `/workspaces`. |
| **TC-01.1e** | Multi-Tenant Workspace Picker | Complete callback for a user with $\ge 2$ tenants (e.g., *Kulkarni LLP* & *KDA Advisory Demo*). | Lands on `/workspaces`. Search box filters by tenant name, code, or role. Checking **Remember last workspace** and selecting a tenant sends `PATCH /me/preferences` with `lastWorkspaceTenantId` and routes to `/dashboard`. |
| **TC-01.1f** | Suspended Account / Tenant (`403`) | Trigger a `403` RFC 9457 response from `POST /auth/oidc/callback`. | Displays `403` badge and suspended-workspace alert message; no session is stored; **Try Again** returns to `/login`. |
| **TC-01.1g** | Cancelled / Failed OIDC Callback | Navigate to `/auth/callback?error=access_denied`. | Displays *"Sign-in could not be completed"* with **Try Again** button returning cleanly to `/login`. |

---

### `US-01.2` — Platform Core Executive Health Dashboard & Governance Feed

| Case ID | Scenario | Steps | Expected Functional Result |
| :--- | :--- | :--- | :--- |
| **TC-01.2a** | KPI Summary & Scoping | Open `/dashboard` with an active session and inspect Network tab. | Calls `GET /api/v1/core/dashboard/summary?windowDays=30` with `Authorization: Bearer ...` and `X-Tenant-Id`. Renders all 4 KPI cards (`Active Tenants`, `Provisioned Organizations`, `Active Platform Users` + MFA %, `Active Module Entitlements`) with tabular numerals. |
| **TC-01.2b** | Archetype & Status Filters | In **Recent Tenant Activity**, select Archetype = `CA Firm`, then Status = `Suspended`. | Table filters immediately to matching rows; when zero rows match, displays *"No matching tenants for the selected filters."* |
| **TC-01.2c** | Alerts & 5-Row Audit Strip | Inspect the right-hand Governance Feed and bottom Audit Events card. | Quota/governance alerts display severity badges (`WARNING`/`CRITICAL`/`INFO`); Audit strip shows at most 5 rows with formatted locale timestamps. |
| **TC-01.2d** | Loading Skeletons | In DevTools Network tab, throttle to **Slow 3G** and reload `/dashboard`. | Displays 4 KPI shimmer skeletons and table skeleton (`aria-busy="true"`) while fetching, with no layout crash. |
| **TC-01.2e** | Retryable API Error | Block `/dashboard/summary` in DevTools Network tab, reload, then unblock and click **Retry**. | Displays inline error alert with **Retry** button; clicking **Retry** re-fetches and renders dashboard data cleanly. |

---

### `US-01.3` — Collapsible/Pinnable Left Nav, Keyboard Shortcuts & Theme Switcher

| Case ID | Scenario | Steps | Expected Functional Result |
| :--- | :--- | :--- | :--- |
| **TC-01.3a** | Default Hidden & Zero-Shift Overlay | On first session (`uiNavPinned: false`) at `1440px` width, observe layout, then click `☰` (or press `Ctrl+B`). | Left nav starts hidden (`100%` content width). Opening displays a `260px` floating overlay (`role="dialog"`) over a dimmed scrim **without shifting** the main dashboard horizontally. |
| **TC-01.3b** | Overlay Dismissal | While overlay is open, test: (1) clicking `×`, (2) clicking outside on the scrim, (3) pressing `Esc`. | All three cleanly close the floating overlay. |
| **TC-01.3c** | Pin Up → Pin Down & Persistence | Open overlay, verify Pin button shows `PinOff` (`data-pin-state="unpinned"`), then click Pin (or press `Ctrl+Shift+P`). Reload the page. | Sidebar docks into `<aside>`, main content shifts cleanly (`ms-[260px]`), icon switches to `Pin` (`data-pin-state="pinned"`), and `PATCH /me/preferences` sends `{"uiNavPinned":true}`. After reload, sidebar stays pinned. |
| **TC-01.3d** | Responsive `<1024px` Override | With sidebar pinned, open DevTools Device Toolbar and set width to `900px`. Check Network tab. Then resize back to `1440px`. | At `900px`, `<aside>` collapses to hidden/overlay mode and **zero** `PATCH /me/preferences` calls are sent. Returning to `1440px` automatically restores the pinned rail. |
| **TC-01.3e** | Icon-Only Light / Dark / System Theme | Inspect the Top Bar appearance button. Click it and select `Dark`, then `System`. In DevTools → **Rendering → Emulate CSS media feature `prefers-color-scheme`**, toggle dark/light. | Collapsed trigger renders **only** the Sun / Moon / Monitor icon (no text). Selecting `Dark` applies `.dark` to `<html>` and sends `PATCH /me/preferences` (`{"uiThemeMode":"DARK"}`). Selecting `System` switches to Monitor icon and follows OS emulation live. |
| **TC-01.3f** | Global Command Search (`Ctrl+K`) | Press `Ctrl+K` (or click Search), type `a` (1 char), then type `me` (2+ chars), then press `Esc`. | `<2` chars shows instructional hint without API call; `>=2` chars triggers `GET /api/v1/core/search?q=me&limit=10`; `Esc` closes dialog. |

---

### `US-01.4` — Permission-Driven Unified Module Switcher & Context Continuity

| Case ID | Scenario | Steps | Expected Functional Result |
| :--- | :--- | :--- | :--- |
| **TC-01.4a** | Admin View (Active + Gated Add-Ons) | Sign in as a Tenant Admin (`subscriptions:manage`), click the `[⊞ Platform Core ▾]` trigger in the Top Bar. | Popover clearly distinguishes **Current** (`Platform Core`), **Active** downstream modules (`Tax & Financial Intelligence`), and **Gated Add-On Modules (Admin)** (`CA Practice & Accounting` with Lock icon and `Manage Subscriptions` link). |
| **TC-01.4b** | Non-Admin Staff View (`BR-015`) | Sign in as operational staff without `subscriptions:view`/`subscriptions:manage` and open Module Switcher. | Gated Add-On Modules section is completely omitted; only permitted active modules appear. |
| **TC-01.4c** | Cross-Module Context Continuity | With **Pinned** sidebar, **Dark** theme, and `Meridian Infra HQ` active, switch to **Tax & Financial Intelligence** (`/modules/tax_financial`), then click **Return to Platform Core**. | Target shell renders the context-synced banner showing preserved Org (`Meridian Infra HQ`), Theme (`dark`), and Locale (`en-IN`), while keeping the sidebar pinned. Returning to Platform Core preserves the exact same state. |

---

### `US-01.5` — Graceful Organization-Level Module Fallback

| Case ID | Scenario | Steps | Expected Functional Result |
| :--- | :--- | :--- | :--- |
| **TC-01.5a** | Org-Disabled Fallback Banner | Select an organization where `payroll_hrms` is disabled (e.g., *Meridian Energy LLP*) and navigate to `/modules/payroll_hrms`. | Renders a non-destructive warning banner (*"payroll_hrms is not enabled for Meridian Energy LLP"*) instead of a generic 403 error, keeping sidebar pin & theme intact. |
| **TC-01.5b** | One-Click Eligible Org Switch | Click an enabled organization (e.g., *Meridian Infra HQ*) in the fallback list. | Updates active `X-Organization-Id` in session context, re-fetches `GET /me/modules`, and transitions smoothly into the enabled module view. |
| **TC-01.5c** | Admin vs. Staff Fallback CTA | Repeat **TC-01.5a** as Tenant Admin vs. Non-Admin Staff. | Tenant Admin sees **Manage Entitlements in Core** button (routing to `/subscriptions`); Non-Admin Staff does **not** see the admin CTA and sees only organizations they are authorized to access (`BR-003`). |

---

## 4. Cross-Cutting Functional Checks (A11Y, I18N & Logout)

1. **Keyboard & Skip Link (`NFR-A11Y-01`):** Press `Tab` immediately after page load → verify **"Skip to main content"** becomes visible and jumps focus to `#main-content`. Confirm visible focus rings on all buttons/inputs in both Light and Dark modes.
2. **I18N Externalization (`NFR-I18N-02`):** Inspect every Epic 1 screen (`/login`, `/workspaces`, `/dashboard`, `/modules/*`) and confirm **zero** raw translation keys (e.g., `dashboard.title`) appear anywhere.
3. **Clean Sign-Out (`US-01.1`):** Click **Sign Out** in the Top Bar → verify `POST /api/v1/core/auth/logout` fires, `sessionStorage` is cleared, and browser returns to `/login`.

---

## 5. Epic 1 Sign-Off Checklist

- [ ] `npm run verify:all` passes (0 TS errors, 0 ESLint warnings, all Vitest suites passing, production build green)
- [ ] `npm run test:bdd` passes (all Gherkin scenarios green)
- [ ] `npm run test:e2e` passes on both `desktop-1440` and `responsive-tablet-900`
- [ ] Docker container builds, starts, restarts, and stops cleanly via `docker compose`
- [ ] Manual checks `TC-01.1a` through `TC-01.5c` verified in Light, Dark, and System modes