// metrix-core/frontend/playwright.config.ts
/*
Purpose: Configures Playwright end-to-end browser testing across desktop and
responsive tablet viewports.

Context: Verifies responsive sidebar override (<1024px vs >=1024px), OIDC flows,
cross-module switching, and WCAG keyboard workflows.

Implementation Specs: Targets Chromium at 1440x900 desktop and 900x900 tablet
viewports against NEXT_PUBLIC_APP_BASE_URL.
*/

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "responsive-tablet-900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 900, height: 900 },
      },
    },
  ],
});
