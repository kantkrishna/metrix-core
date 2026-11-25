// frontend/tests/unit/module-switcher-fallback.spec.tsx
/*
Purpose: Verifies US-01.4 (Permission-Driven Unified Module Switcher) and US-01.5
(Graceful Organization-Level Module Fallback) including Admin vs. non-admin
gated add-on visibility and one-click org recovery.

Context: Enforces FR-CORE-008, FR-CORE-009, FR-CORE-010, BR-015, and BR-016.

Implementation Specs: Vitest 5 + React Testing Library + userEvent.
*/

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AccessibleModulesManifestResponse } from "@/contracts/shell-auth.schemas";
import { ModuleSwitcher } from "@/features/shell/module-switcher";
import { OrganizationModuleFallback } from "@/features/shell/organization-module-fallback";
import { I18nProvider } from "@/i18n/i18n-provider";

const ADMIN_MANIFEST: AccessibleModulesManifestResponse = {
  tenantId: "00000000-0000-4000-8000-000000000101",
  organizationId: "00000000-0000-4000-8000-000000000201",
  organizationCode: "ORG-4401",
  organizationName: "Meridian Infra HQ",
  contextFallback: null,
  uiPreferences: {
    userId: "00000000-0000-4000-8000-000000000001",
    uiNavPinned: true,
    uiThemeMode: "DARK",
    unreadNotificationCount: 0,
  },
  modules: [
    {
      code: "platform_core",
      name: "Platform Core",
      description: "Tenants, RBAC & Audit",
      baseUrl: "/dashboard",
      themeKey: "core",
      apiVersion: "1.4.0",
      status: "ACTIVE",
      healthStatus: "OPERATIONAL",
      isCoreService: true,
      permittedRoutes: ["dashboard", "subscriptions"],
      effectivePermissions: ["dashboard:view", "subscriptions:manage"],
      featureFlags: {},
    },
    {
      code: "tax_financial",
      name: "Tax & Financial Intelligence",
      description: "Advance Tax, Income Tax & GST",
      baseUrl: "/modules/tax_financial",
      themeKey: "tax",
      apiVersion: "1.2.0",
      status: "ACTIVE",
      healthStatus: "OPERATIONAL",
      isCoreService: false,
      permittedRoutes: ["overview"],
      effectivePermissions: ["tax.scenarios:read"],
      featureFlags: {},
    },
  ],
  lockedAddOns: [
    {
      code: "ca_practice",
      name: "CA Practice & Accounting",
      description: "Client engagements & accounting",
      status: "NOT_SUBSCRIBED",
      manageSubscriptionUrl: "/subscriptions",
      upgradeRequired: true,
    },
  ],
  evaluatedAt: "2026-11-24T06:30:00.000Z",
};

describe("US-01.4 Unified Module Switcher & US-01.5 Org-Level Graceful Fallback", () => {
  it("shows locked add-ons for Tenant Admin and routes module switches", async () => {
    const user = userEvent.setup();
    const onSelectModule = vi.fn();
    const onManageSubscriptions = vi.fn();

    render(
      <I18nProvider>
        <ModuleSwitcher
          manifest={ADMIN_MANIFEST}
          activeModuleCode="platform_core"
          onSelectModule={onSelectModule}
          onManageSubscriptions={onManageSubscriptions}
        />
      </I18nProvider>
    );

    await user.click(
      screen.getByRole("button", { name: /switch metrix module/i })
    );
    expect(screen.getByText("Tax & Financial Intelligence")).toBeInTheDocument();
    expect(screen.getByText("CA Practice & Accounting")).toBeInTheDocument();

    await user.click(
      screen.getByRole("menuitem", { name: /tax & financial intelligence/i })
    );
    expect(onSelectModule).toHaveBeenCalledWith(
      "tax_financial",
      "/modules/tax_financial"
    );
  });

  it("omits gated add-ons for non-admin operational staff", async () => {
    const user = userEvent.setup();
    const staffManifest: AccessibleModulesManifestResponse = {
      ...ADMIN_MANIFEST,
      lockedAddOns: [],
      modules: ADMIN_MANIFEST.modules.map((m) => ({
        ...m,
        effectivePermissions: ["tax.scenarios:read"],
      })),
    };

    render(
      <I18nProvider>
        <ModuleSwitcher
          manifest={staffManifest}
          activeModuleCode="platform_core"
          onSelectModule={vi.fn()}
          onManageSubscriptions={vi.fn()}
        />
      </I18nProvider>
    );

    await user.click(
      screen.getByRole("button", { name: /switch metrix module/i })
    );
    expect(
      screen.queryByText("CA Practice & Accounting")
    ).not.toBeInTheDocument();
  });

  it("renders org fallback banner with eligible orgs and hides admin CTA for staff", async () => {
    const user = userEvent.setup();
    const onSwitchOrg = vi.fn();

    const { rerender } = render(
      <I18nProvider>
        <OrganizationModuleFallback
          moduleName="Payroll & HRMS"
          currentOrganizationName="Meridian Energy LLP"
          eligibleOrganizations={[
            {
              id: "00000000-0000-4000-8000-000000000201",
              orgCode: "ORG-4401",
              legalName: "Meridian Infra HQ",
            },
          ]}
          canManageEntitlements={false}
          onSwitchOrganization={onSwitchOrg}
          onManageEntitlements={vi.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText(/payroll & hrms is not enabled for meridian energy llp/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /manage entitlements/i })
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: /meridian infra hq/i })
    );
    expect(onSwitchOrg).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000201"
    );

    rerender(
      <I18nProvider>
        <OrganizationModuleFallback
          moduleName="Payroll & HRMS"
          currentOrganizationName="Meridian Energy LLP"
          eligibleOrganizations={[]}
          canManageEntitlements={true}
          onSwitchOrganization={onSwitchOrg}
          onManageEntitlements={vi.fn()}
        />
      </I18nProvider>
    );
    expect(
      screen.getByRole("button", { name: /manage entitlements/i })
    ).toBeInTheDocument();
  });
});
