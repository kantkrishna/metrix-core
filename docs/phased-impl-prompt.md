## Requirements & Architecture Sources for METRix Platform Core Frontend + Backend

- Product Requirements & Agile Backlog: `requirements.md`
- High-Level Architecture Direction: `METRix-HLD-Concise-20261122.md`
- Authoritative API Contract: `openapi-platform-core-v1.yaml`
- Figma Design System Theme Tokens: `design-tokens.tokens.json`
- `metrix-core/backend/`: Implements the backend microservice using NestJS, PostgreSQL, and Drizzle ORM. Includes FORCE RLS-based tenant isolation, delegated OIDC authentication, RBAC, subscription and entitlement management, audit logging, and OpenAPI 3.1 APIs.
- `metrix-core/frontend/`: Contains the React-based frontend implementation.

This is not a PoC, but the main production application development for the **METRix Platform Core Service React Frontend** (Next.js, React, TypeScript, Tailwind CSS with `@theme inline` Light/Dark tokens, and `shadcn/ui`).

Analyze `requirements.md` and the attached architecture/API references to fully understand the business outcomes, personas, business rules, non-functional requirements (including multi-tenant isolation, WCAG 2.1 AA accessibility, and I18N externalized copy readiness), and user experience.

- Use `requirements.md` as the primary product requirements source. It contains the Epics, prioritized slices, child user stories, binding acceptance criteria, and illustrative BDD scenarios.
- Implement all business logic in the NestJS microservice (`metrix-core/backend/`), keep the React frontend UI-only, and handle all PostgreSQL data persistence through Drizzle ORM.
- Execute **Epic 1 (`EP-01`: Delegated Authentication, Workspace Context & Unified App Shell)** only as defined in `requirements.md`. *(For subsequent iterations, replace `Epic 1 (EP-01)` with the next target Epic.)*
- Implement the Epic using strict **TDD (Test-Driven Development)**.
- The attached `repomix-output-frontend.xml` (when provided) contains the current state of the frontend repository. Use it as the source of truth when analyzing or modifying the project. If no repository snapshot is attached, initialize a clean production-ready frontend repository aligned with the METRix architecture.

## Requirements

1. Review **Epic 1 (`EP-01`)** and all of its child user stories (`US-01.1`–`US-01.5`) to identify every acceptance criterion, business rule, API contract dependency, non-functional requirement, and expected end-user outcome.
2. Create failing automated tests first for each acceptance criterion and representative BDD scenario (Red phase). Do not implement production functionality before the corresponding test exists.
3. Implement the minimum clean, production-quality frontend code required to satisfy the tests, aligned with `openapi-platform-core-v1.yaml` and the Light/Dark/System `@theme inline` design system (Green phase).
4. Refactor for maintainability, accessibility, I18N readiness (zero hardcoded UI strings; `en-IN` resource baseline), and clean architecture without breaking any tests (Refactor phase).
5. Validate the implementation against every acceptance criterion—including alternate flows, responsive behavior, state persistence, permission/entitlement boundaries, and error/fallback states—not just the happy path.
6. Help me run the full relevant verification suite (typecheck, lint, unit/component tests, and E2E/BDD tests where applicable) and verify that the application (and container setup, if present) builds, starts, stops, restarts, and runs cleanly as documented.
7. Help me fix any failures, warnings, or regressions before considering the Epic complete.

## Execution Rules

1. Follow **Red → Green → Refactor** strictly.
2. Do not skip, weaken, or over-mock tests to make them pass.
3. Prefer existing repository conventions, tooling, and reusable `shadcn/ui` primitives; keep the architecture clean, modular, and outcome-focused rather than over-engineered.
4. Keep changes strictly scoped to **Epic 1 (`EP-01`)** only; avoid speculative implementation for future Epics or unrelated refactoring.
5. Treat every acceptance criterion and applicable business rule as a release gate.
6. Provide complete runnable code and PowerShell commands to set up, test, and execute the project in VS Code on Windows.
7. Every code and configuration file must follow these naming and header comment rules:
    
   7.1. Use descriptive, context-driven directory and file names that clearly reflect functional purpose and scope. Avoid serial-number-based naming conventions (e.g., `epic_1`, `story_1_1`, `phase_1`).
   
   7.2. Include the relative file path as the first line (e.g., `// frontend/src/features/shell/module-switcher.tsx`).
   
   7.3. Include a concise header comment using appropriate syntax for the file type containing:

     - `Purpose:` High-level description of its responsibilities
     - `Context:` Essential security, multi-tenancy, architectural, and/or product context
     - `Implementation Specs:` Key library, contract, or integration details

   Example 1 (Config / non-code file):

   ```
   # frontend/.gitignore
   #
   # Purpose: Excludes dependencies, Next.js build outputs, test coverage, and local environment
   # files from version control.
   #
   # Context: Maintains clean repository hygiene for frontend/.
   #
   # Implementation Specs: Covers Node.js, Next.js, Vitest, Playwright, Docker, and VS Code files.
   
   ```

   Example 2 (TypeScript / React file):

   ```
   // frontend/src/features/shell/module-switcher.tsx
   /*
   Purpose: Renders the permission-driven Unified Module Switcher in the persistent Top Bar for
   switching between Platform Core and enabled downstream METRix modules.
   
   Context: Satisfies US-01.4, US-01.5, and BR-015 by surfacing active modules, hiding gated
   add-ons from non-admin roles, and preserving org context, pin state, theme, and locale.
   
   Implementation Specs: React + shadcn/ui Popover hydrated from GET /api/v1/core/me/modules with
   externalized en-IN message keys and keyboard/ARIA support.
   */
   
   ```

   Example 3 (CSS / Theme file):

   ```
   /* frontend/src/styles/tokens-core-theme.css
   
   Purpose: Defines Tailwind v4 @theme inline semantic color tokens for Light (:root) and Dark
   (.dark) modes across the Platform Core administration portal.
   
   Context: Enforces WCAG 2.1 AA contrast and consistent Cool Slate / Deep Zinc surface hierarchy
   aligned with the Platform Core Figma Design System.
   
   Implementation Specs: CSS custom properties consumed by Tailwind utility classes and shadcn/ui.
   */
   
   ```

8. Ensure all code lines—including comments and docstrings—are limited to a maximum of 100 characters, wrapping longer lines cleanly as necessary.

9. Do not declare Epic 1 complete until all tests, typechecks, and acceptance criteria are demonstrably satisfied.

## Final Deliverables & Git Check-in

Generate the interactive browser-based ZIP package builder and downloader for each Polyrepo directory (`metrix-core/frontend/`, `metrix-core/backend/`) that you just created or updated so that I can download the `.zip` archives directly with one click.

Provide the Git check-in commands using a concise, multiline commit message via the Heredoc method.