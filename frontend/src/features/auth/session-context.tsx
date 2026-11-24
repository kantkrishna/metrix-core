// metrix-core/frontend/src/features/auth/session-context.tsx
/*
Purpose: Maintains client-side OIDC session state, active tenant/organization
RLS context headers, and workspace list across the Platform Core UI.

Context: Supplies RequestContext (Bearer JWT, X-Tenant-Id, X-Organization-Id,
Accept-Language) to API calls while keeping all authorization decisions on the
NestJS backend.

Implementation Specs: React context persisting non-sensitive active tenant/org
context in sessionStorage and clearing state cleanly on logout.
*/

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  OidcCallbackResponse,
  UserUiPreferences,
  WorkspaceSummary,
} from "@/contracts/shell-auth.schemas";
import { useTranslations } from "@/i18n/i18n-provider";
import type { RequestContext } from "@/lib/api/http-client";
import { coreApi } from "@/lib/api/platform-core-api";
import { useThemePreference } from "@/providers/theme-provider";

const SESSION_STORAGE_KEY = "metrix.core.session.v1";

interface PersistedSession {
  accessToken: string;
  user: UserUiPreferences;
  workspaces: WorkspaceSummary[];
  activeTenantId: string | null;
  activeOrganizationId: string | null;
}

export interface SessionContextValue {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserUiPreferences | null;
  workspaces: WorkspaceSummary[];
  activeTenantId: string | null;
  activeOrganizationId: string | null;
  requestContext: RequestContext;
  establishSession: (payload: OidcCallbackResponse) => string | null;
  selectTenantWorkspace: (tenantId: string) => void;
  selectOrganization: (organizationId: string | null) => void;
  signOut: () => Promise<string | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readInitialSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: PersistedSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { locale } = useTranslations();
  const { setPreference } = useThemePreference();
  const [session, setSession] = useState<PersistedSession | null>(() =>
    readInitialSession()
  );

  const establishSession = useCallback(
    (payload: OidcCallbackResponse): string | null => {
      const remembered = payload.user.lastWorkspaceTenantId ?? null;
      const matchedRemembered = payload.workspaces.find(
        (ws) => ws.tenantId === remembered
      );
      const singleWorkspace =
        payload.workspaces.length === 1 ? payload.workspaces[0] : undefined;
      const activeTenantId =
        singleWorkspace?.tenantId ?? matchedRemembered?.tenantId ?? null;

      const next: PersistedSession = {
        accessToken: payload.accessToken,
        user: payload.user,
        workspaces: payload.workspaces,
        activeTenantId,
        activeOrganizationId: null,
      };
      setSession(next);
      writeSession(next);
      setPreference(payload.user.uiThemeMode);
      return activeTenantId;
    },
    [setPreference]
  );

  const selectTenantWorkspace = useCallback((tenantId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next: PersistedSession = {
        ...prev,
        activeTenantId: tenantId,
        activeOrganizationId: null,
      };
      writeSession(next);
      return next;
    });
  }, []);

  const selectOrganization = useCallback((organizationId: string | null) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next: PersistedSession = {
        ...prev,
        activeOrganizationId: organizationId,
      };
      writeSession(next);
      return next;
    });
  }, []);

  const requestContext = useMemo<RequestContext>(
    () => ({
      accessToken: session?.accessToken ?? null,
      tenantId: session?.activeTenantId ?? null,
      organizationId: session?.activeOrganizationId ?? null,
      locale,
    }),
    [session, locale]
  );

  const signOut = useCallback(async (): Promise<string | null> => {
    let endUrl: string | null = null;
    if (session?.accessToken) {
      try {
        const res = await coreApi.logout(requestContext);
        endUrl = res.oidcEndSessionUrl;
      } catch {
        endUrl = null;
      }
    }
    setSession(null);
    writeSession(null);
    return endUrl;
  }, [requestContext, session?.accessToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.accessToken),
      accessToken: session?.accessToken ?? null,
      user: session?.user ?? null,
      workspaces: session?.workspaces ?? [],
      activeTenantId: session?.activeTenantId ?? null,
      activeOrganizationId: session?.activeOrganizationId ?? null,
      requestContext,
      establishSession,
      selectTenantWorkspace,
      selectOrganization,
      signOut,
    }),
    [
      session,
      requestContext,
      establishSession,
      selectTenantWorkspace,
      selectOrganization,
      signOut,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider.");
  }
  return ctx;
}
