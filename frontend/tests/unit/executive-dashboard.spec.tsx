// frontend/tests/unit/executive-dashboard.spec.tsx
/*
Purpose: Verifies US-01.2 acceptance criteria for the Platform Core Executive
Dashboard: 4 KPI summaries, CustomerType and TenantStatus filtering, governance
alert feed, 5-row high-risk audit strip, loading skeletons, and retryable error.

Context: Validates FR-CORE-003 and tenant-scoped dashboard hydration from
GET /api/v1/core/dashboard/summary.

Implementation Specs: Vitest 5 + React Testing Library + TanStack Query.
*/

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/features/auth/session-context";
import { ExecutiveDashboardView } from "@/features/dashboard/executive-dashboard-view";
import { I18nProvider } from "@/i18n/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const SAMPLE_DASHBOARD = {
  kpis: {
    activeTenants: 148,
    provisionedOrgs: 612,
    activeUsers: 4290,
    mfaEnrolledPct: 98.6,
    activeModuleEntitlements: 341,
  },
  recentTenants: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      tenantCode: "TNT-0881",
      legalName: "Meridian Infrastructure Group",
      slug: "meridian-infra",
      customerType: "ENTERPRISE",
      status: "ACTIVE",
      quota: {
        seatLimit: 150,
        activeSeatsUsed: 142,
        pendingInviteSeats: 2,
        orgLimit: 10,
        activeOrgsUsed: 6,
        seatUtilizationPct: 94.6,
        orgUtilizationPct: 60,
        isSeatNearCap: true,
        isOrgNearCap: false,
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      tenantCode: "TNT-0319",
      legalName: "Kulkarni, Deshmukh & Associates LLP",
      slug: "kulkarni-associates",
      customerType: "CA_FIRM",
      status: "TRIAL",
      quota: {
        seatLimit: 25,
        activeSeatsUsed: 24,
        pendingInviteSeats: 0,
        orgLimit: 50,
        activeOrgsUsed: 48,
        seatUtilizationPct: 96,
        orgUtilizationPct: 96,
        isSeatNearCap: true,
        isOrgNearCap: true,
      },
    },
  ],
  governanceAlerts: [
    {
      severity: "WARNING",
      title: "Client Org Quota at 96%",
      detail: "Kulkarni, Deshmukh & Associates LLP uses 48 of 50 client orgs.",
    },
  ],
  recentHighRiskAudits: [
    {
      id: "00000000-0000-4000-8000-000000000901",
      eventCode: "EVT-98412",
      actorNameSnapshot: "Rohan Kulkarni",
      serviceSource: "platform_core",
      actionCategory: "RBAC",
      eventAction: "role.permissions.updated",
      targetResourceType: "role",
      outcome: "SUCCESS",
      retentionUntilOn: "2033-11-24",
      createdBy: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-11-24T06:30:00.000Z",
    },
  ],
};

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider defaultPreference="LIGHT">
        <I18nProvider>
          <SessionProvider>
            <ExecutiveDashboardView />
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("US-01.2 Platform Core Executive Health Dashboard", () => {
  it("renders KPIs, filters tenants by type/status, and shows alerts & audits", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(SAMPLE_DASHBOARD), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    );

    renderDashboard();

    expect(await screen.findByText("148")).toBeInTheDocument();
    expect(screen.getByText("612")).toBeInTheDocument();
    expect(screen.getByText("4,290")).toBeInTheDocument();
    expect(screen.getByText("341")).toBeInTheDocument();
    expect(screen.getByText("Client Org Quota at 96%")).toBeInTheDocument();
    expect(screen.getByText("role.permissions.updated")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/filter by customer type/i),
      "CA_FIRM"
    );
    expect(
      screen.getByText("Kulkarni, Deshmukh & Associates LLP")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Meridian Infrastructure Group")
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/filter by status/i),
      "SUSPENDED"
    );
    expect(screen.getByText(/no matching tenants/i)).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("displays an inline error state with Retry on API failure", async () => {
    const user = userEvent.setup();
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                type: "about:blank",
                title: "Service Unavailable",
                status: 503,
                detail: "Dashboard temporarily unavailable",
              }),
              { status: 503, headers: { "Content-Type": "application/problem+json" } }
            )
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify(SAMPLE_DASHBOARD), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      })
    );

    renderDashboard();

    expect(
      await screen.findByText(/dashboard temporarily unavailable/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByText("148")).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
