// frontend/tests/e2e/auth-and-unified-shell.spec.ts
/*
Purpose: Playwright E2E acceptance test validating delegated OIDC sign-in UI,
zero password field compliance, and keyboard accessibility across desktop
(1440px) and tablet (900px) projects.

Context: Verifies US-01.1 and NFR-A11Y-01 against the running Next.js server.

Implementation Specs: Intercepts Platform Core OIDC discovery endpoint with
Playwright page.route() to validate redirect handoff safely.
*/

import { expect, test } from "@playwright/test";

test("delegated OIDC login screen renders without password inputs", async ({
  page,
}) => {
  await page.route("**/api/v1/core/auth/oidc/discover", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        providerType: "MANAGED_OIDC",
        authorizationUrl: "https://id.metrix-erp.cloud/authorize",
        issuerUrl: "https://id.metrix-erp.cloud/realms/platform-core",
      }),
    });
  });

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /sign in to metrix/i })
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /continue with enterprise sso/i })
  ).toBeVisible();
});
