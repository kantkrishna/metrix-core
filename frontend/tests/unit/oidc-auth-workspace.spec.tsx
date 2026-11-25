// frontend/tests/unit/oidc-auth-workspace.spec.tsx
/*
Purpose: Verifies US-01.1 acceptance criteria and BDD scenarios for delegated OIDC
sign-in, Enterprise SSO routing, multi-tenant workspace selection, suspended
account denial, and failed OIDC callback recovery.

Context: Enforces FR-CORE-001, FR-CORE-002, BR-003, and BR-004 with zero password
capture in Platform Core.

Implementation Specs: Vitest 5 + React Testing Library + userEvent against
PlatformCoreApi using mocked fetch responses.
*/

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OidcCallbackView } from "@/features/auth/oidc-callback-view";
import { OidcSignInView } from "@/features/auth/oidc-sign-in-view";
import { SessionProvider } from "@/features/auth/session-context";
import { WorkspacePickerView } from "@/features/auth/workspace-picker-view";
import { I18nProvider } from "@/i18n/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultPreference="LIGHT">
        <I18nProvider>
          <SessionProvider>{ui}</SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("US-01.1 Delegated OIDC Sign-In & Multi-Tenant Workspace Selection", () => {
  it("discovers Enterprise SSO OIDC URL without rendering any password input", async () => {
    const user = userEvent.setup();
    const redirectSpy = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              providerType: "ENTRA_ID_SSO",
              authorizationUrl: "https://id.metrix-erp.cloud/authorize?client=core",
              issuerUrl: "https://id.metrix-erp.cloud/realms/platform-core",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      )
    );

    renderWithProviders(<OidcSignInView onRedirect={redirectSpy} />);

    expect(document.querySelector('input[type="password"]')).toBeNull();

    await user.type(
      screen.getByLabelText(/tenant workspace identifier/i),
      "meridian-infra"
    );
    await user.type(screen.getByLabelText(/work email/i), "vikram@meridian.in");
    await user.click(
      screen.getByRole("button", { name: /continue with enterprise sso/i })
    );

    await waitFor(() => {
      expect(redirectSpy).toHaveBeenCalledTimes(1);
    });
    const redirectedUrl = redirectSpy.mock.calls[0]?.[0] as string;
    expect(redirectedUrl).toContain("https://id.metrix-erp.cloud/authorize");
    expect(redirectedUrl).toContain("state=");

    vi.unstubAllGlobals();
  });

  it("lands single-tenant admin directly on /dashboard after OIDC callback", async () => {
    const onNavigate = vi.fn();
    window.sessionStorage.setItem("metrix.oidc.state", "state-123");
    window.sessionStorage.setItem("metrix.oidc.verifier", "verifier-abc");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: "jwt-single-tenant",
              expiresInSeconds: 3600,
              user: {
                userId: "00000000-0000-4000-8000-000000000010",
                uiNavPinned: false,
                uiThemeMode: "LIGHT",
                unreadNotificationCount: 1,
              },
              workspaces: [
                {
                  tenantId: "00000000-0000-4000-8000-000000000101",
                  tenantCode: "TNT-0881",
                  legalName: "Meridian Infrastructure Group",
                  customerType: "ENTERPRISE",
                  roleName: "Tenant Admin",
                  isTenantOwner: true,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      )
    );

    renderWithProviders(
      <OidcCallbackView
        code="auth-code-xyz"
        state="state-123"
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("/dashboard");
    });

    vi.unstubAllGlobals();
  });

  it("routes multi-tenant admin to /workspaces and filters selectable tenants", async () => {
    const user = userEvent.setup();
    const onSelected = vi.fn();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            userId: "00000000-0000-4000-8000-000000000011",
            uiNavPinned: true,
            uiThemeMode: "DARK",
            lastWorkspaceTenantId: "00000000-0000-4000-8000-000000000201",
            unreadNotificationCount: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <WorkspacePickerView
        workspaces={[
          {
            tenantId: "00000000-0000-4000-8000-000000000201",
            tenantCode: "TNT-0319",
            legalName: "Kulkarni, Deshmukh & Associates LLP",
            customerType: "CA_FIRM",
            roleName: "CA Partner",
            isTenantOwner: true,
          },
          {
            tenantId: "00000000-0000-4000-8000-000000000202",
            tenantCode: "TNT-0999",
            legalName: "KDA Advisory Demo",
            customerType: "INDIVIDUAL_SMB",
            roleName: "Advisor",
            isTenantOwner: false,
          },
        ]}
        onWorkspaceSelected={onSelected}
      />
    );

    await user.type(screen.getByPlaceholderText(/search workspaces/i), "Kulkarni");
    expect(
      screen.getByText("Kulkarni, Deshmukh & Associates LLP")
    ).toBeInTheDocument();
    expect(screen.queryByText("KDA Advisory Demo")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/remember last workspace/i));
    await user.click(
      screen.getByRole("button", { name: /kulkarni, deshmukh/i })
    );

    await waitFor(() => {
      expect(onSelected).toHaveBeenCalledWith(
        "00000000-0000-4000-8000-000000000201"
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({ method: "PATCH" })
    );

    vi.unstubAllGlobals();
  });

  it("denies suspended tenant accounts with an informative message", async () => {
    const onNavigate = vi.fn();
    window.sessionStorage.setItem("metrix.oidc.state", "state-susp");
    window.sessionStorage.setItem("metrix.oidc.verifier", "verifier-susp");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              type: "https://api.metrix-erp.cloud/errors/suspended",
              title: "Workspace Suspended",
              status: 403,
              detail: "Tenant Zenith Advisory Services is suspended.",
            }),
            { status: 403, headers: { "Content-Type": "application/problem+json" } }
          )
        )
      )
    );

    renderWithProviders(
      <OidcCallbackView
        code="code-susp"
        state="state-susp"
        onNavigate={onNavigate}
      />
    );

    expect(
      await screen.findByText(/currently suspended/i)
    ).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("renders a recoverable error with Retry when OIDC callback is cancelled", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderWithProviders(
      <OidcCallbackView
        oidcError="access_denied"
        onNavigate={onNavigate}
      />
    );

    expect(
      screen.getByText(/sign-in could not be completed/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onNavigate).toHaveBeenCalledWith("/login");
  });
});
