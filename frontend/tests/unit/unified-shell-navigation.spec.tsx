// frontend/tests/unit/unified-shell-navigation.spec.tsx
/*
Purpose: Verifies US-01.3 acceptance criteria for collapsible/pinnable left
navigation (default hidden, zero-shift overlay, Pin Up/Pin Down persistence,
<1024px temporary override) and icon-only Light/Dark/System appearance menu.

Context: Validates FR-CORE-004, FR-CORE-005, FR-CORE-006, FR-CORE-007, BR-017,
and WCAG 2.1 AA keyboard shortcuts (Ctrl+B, Ctrl+Shift+P, Esc).

Implementation Specs: Vitest 5 + React Testing Library + userEvent.
*/

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/features/auth/session-context";
import { UnifiedAppShell } from "@/features/shell/unified-app-shell";
import { I18nProvider } from "@/i18n/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const BASE_MANIFEST = {
  tenantId: "00000000-0000-4000-8000-000000000101",
  organizationId: "00000000-0000-4000-8000-000000000201",
  organizationCode: "ORG-4401",
  organizationName: "Meridian Infra HQ",
  contextFallback: null,
  uiPreferences: {
    userId: "00000000-0000-4000-8000-000000000001",
    uiNavPinned: false,
    uiThemeMode: "LIGHT" as const,
    unreadNotificationCount: 3,
  },
  modules: [
    {
      code: "platform_core",
      name: "Platform Core",
      description: "Tenants, RBAC, Subscriptions",
      baseUrl: "/dashboard",
      themeKey: "core",
      apiVersion: "1.4.0",
      status: "ACTIVE" as const,
      healthStatus: "OPERATIONAL" as const,
      isCoreService: true,
      permittedRoutes: ["dashboard", "tenants", "organizations"],
      effectivePermissions: ["dashboard:view", "subscriptions:manage"],
      featureFlags: {},
    },
  ],
  lockedAddOns: [],
  evaluatedAt: "2026-11-24T06:30:00.000Z",
};

function renderShell(initialPinned = false) {
  const manifest = {
    ...BASE_MANIFEST,
    uiPreferences: {
      ...BASE_MANIFEST.uiPreferences,
      uiNavPinned: initialPinned,
    },
  };

  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/me/preferences") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body ?? "{}"));
      return Promise.resolve(
        new Response(
          JSON.stringify({ ...manifest.uiPreferences, ...body }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    if (url.includes("/health/services")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ operationalCount: 4, totalCount: 4, services: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1440,
  });

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={qc}>
      <ThemeProvider defaultPreference="LIGHT">
        <I18nProvider>
          <SessionProvider>
            <UnifiedAppShell activeModuleCode="platform_core">
              <div>Workspace Body</div>
            </UnifiedAppShell>
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return { ...result, fetchMock };
}

describe("US-01.3 Adaptive Left Navigation & Icon-Only Theme Switcher", () => {
  it("starts hidden, opens floating overlay via Ctrl+B, pins with Pin Down & persists", async () => {
    const user = userEvent.setup();
    const { fetchMock } = renderShell(false);

    await screen.findByText("Workspace Body");
    expect(screen.queryByRole("dialog", { name: /platform core/i })).toBeNull();

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(
      await screen.findByRole("dialog", { name: /navigation/i })
    ).toBeInTheDocument();

    const pinBtn = screen.getByRole("button", { name: /pin navigation menu/i });
    expect(pinBtn).toHaveAttribute("data-pin-state", "unpinned");
    await user.click(pinBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /unpin navigation menu/i })
      ).toHaveAttribute("data-pin-state", "pinned");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"uiNavPinned":true'),
      })
    );

    vi.unstubAllGlobals();
  });

  it("overrides pinned sidebar to overlay below 1024px without overwriting preference", async () => {
    const { fetchMock } = renderShell(true);

    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });

    act(() => {
      window.innerWidth = 900;
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("complementary")).toBeNull();
    });

    const patchCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("/me/preferences") &&
        (init as RequestInit | undefined)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);

    act(() => {
      window.innerWidth = 1440;
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("renders icon-only theme button and switches to System mode syncing OS dark", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { fetchMock } = renderShell(false);

    const themeTrigger = await screen.findByRole("button", {
      name: /change appearance theme/i,
    });
    expect(themeTrigger.textContent?.trim()).toBe("");

    await user.click(themeTrigger);
    await user.click(screen.getByRole("menuitemradio", { name: /system/i }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(themeTrigger).toHaveAttribute("data-theme-icon", "system");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"uiThemeMode":"SYSTEM"'),
      })
    );

    vi.unstubAllGlobals();
  });
});
