// metrix-core/frontend/tests/unit/foundation-scaffold.spec.tsx
/*
Purpose: Verifies core scaffold guarantees prior to Epic 1 TDD implementation:
RLS header injection, RFC 9457 ProblemDetails parsing, Decimal.js currency
formatting, BCP-47 I18N fallback (BR-023), and Light/Dark/System ThemeProvider.

Context: Acts as the baseline regression suite protecting cross-cutting NFRs
across all future Epics.

Implementation Specs: Executes in Vitest 5 + jsdom 31 with mocked fetch calls.
*/

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/contracts/problem-details";
import {
  I18nProvider,
  resolveEffectiveLocale,
  useTranslations,
} from "@/i18n/i18n-provider";
import { PlatformCoreHttpClient } from "@/lib/api/http-client";
import { formatDecimalMoney } from "@/lib/formatters";
import {
  ThemeProvider,
  useThemePreference,
} from "@/providers/theme-provider";

function I18nProbe(): React.ReactElement {
  const { locale, t } = useTranslations();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t("common.appName")}</span>
      <span data-testid="fallback">{t("auth.continueOidc")}</span>
    </div>
  );
}

function ThemeProbe(): React.ReactElement {
  const { preference, resolvedTheme, setPreference } = useThemePreference();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setPreference("DARK")}>
        Set Dark
      </button>
    </div>
  );
}

describe("METRix Platform Core Frontend Scaffold Foundation", () => {
  it("formats Decimal.js INR contract values without floating-point drift", () => {
    expect(formatDecimalMoney("240000.00")).toBe("₹2,40,000.00");
    expect(formatDecimalMoney("-42684.93")).toBe("-₹42,684.93");
  });

  it("injects OIDC Bearer, X-Tenant-Id, X-Organization-Id, and Accept-Language", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new PlatformCoreHttpClient("http://localhost:4001/api/v1/core");
    await client.request({
      path: "/me/modules",
      query: { includeLockedAddOns: true },
      context: {
        accessToken: "jwt-token-123",
        tenantId: "00000000-0000-4000-8000-000000000001",
        organizationId: "00000000-0000-4000-8000-000000000002",
        locale: "en-IN",
      },
    });

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(calledUrl).toContain("/me/modules?includeLockedAddOns=true");
    expect(headers.get("Authorization")).toBe("Bearer jwt-token-123");
    expect(headers.get("X-Tenant-Id")).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
    expect(headers.get("X-Organization-Id")).toBe(
      "00000000-0000-4000-8000-000000000002"
    );
    expect(headers.get("Accept-Language")).toBe("en-IN");

    vi.unstubAllGlobals();
  });

  it("normalizes RFC 9457 403 ProblemDetails with missingPermission and traceId", async () => {
    const problemPayload = {
      type: "https://api.metrix-erp.cloud/errors/forbidden",
      title: "Forbidden",
      status: 403,
      detail: "Missing required permission",
      missingPermission: "subscriptions:manage",
      traceId: "4bf92f3577b34da6",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(problemPayload), {
            status: 403,
            headers: { "Content-Type": "application/problem+json" },
          })
        )
      )
    );

    const client = new PlatformCoreHttpClient("http://localhost:4001/api/v1/core");
    expect.assertions(4);
    try {
      await client.request({ path: "/subscriptions/current" });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiProblemError);
      const apiErr = err as ApiProblemError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.missingPermission).toBe("subscriptions:manage");
      expect(apiErr.traceId).toBe("4bf92f3577b34da6");
    }

    vi.unstubAllGlobals();
  });

  it("resolves BCP-47 locale hierarchy and falls back missing keys to en-IN", () => {
    expect(
      resolveEffectiveLocale(
        { userLocale: "hi-IN", tenantLocale: "en-IN" },
        ["en-IN", "hi-IN"]
      )
    ).toBe("hi-IN");

    render(
      <I18nProvider
        initialHierarchy={{ userLocale: "hi-IN", tenantLocale: "en-IN" }}
        bundles={{
          "en-IN": {
            common: { appName: "METRix Platform Core" },
            auth: { continueOidc: "Continue with Enterprise SSO (OIDC)" },
          },
          "hi-IN": {
            common: { appName: "METRix प्लेटफ़ॉर्म कोर" },
          },
        }}
      >
        <I18nProbe />
      </I18nProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("hi-IN");
    expect(screen.getByTestId("title")).toHaveTextContent(
      "METRix प्लेटफ़ॉर्म कोर"
    );
    expect(screen.getByTestId("fallback")).toHaveTextContent(
      "Continue with Enterprise SSO (OIDC)"
    );
  });

  it("applies .dark class and persists preference when ThemeProvider updates", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultPreference="LIGHT">
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Set Dark" }));

    expect(screen.getByTestId("pref")).toHaveTextContent("DARK");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
