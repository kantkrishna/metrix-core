// frontend/src/features/auth/session-context.tsx
/*
Purpose: Maintains client-side OIDC session state, active tenant/organization
RLS context headers, and workspace list across the Platform Core UI.

Context: Supplies RequestContext (Bearer JWT, X-Tenant-Id, X-Organization-Id,
Accept-Language) while preventing SSR/client hydration mismatches.

Implementation Specs: Uses referentially stable useSyncExternalStore snapshots
backed by sessionStorage and exposes isHydrated for route guards.
*/

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  OidcCallbackResponse,
  UserUiPreferences,
  WorkspaceSummary,
} from "@/contracts/shell-auth.schemas";
import { useTranslations } from "@/i18n/i18n-provider";
import type { RequestContext } from "@/lib/api/http-client";
import { coreApi } from "@/lib/api/platform-core-api";
import { useQueryClient } from "@tanstack/react-query";
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
  isHydrated: boolean;
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
const sessionListeners = new Set<() => void>();
let cachedRawSession: string | null = null;
let cachedParsedSession: PersistedSession | null = null;

function notifySessionListeners(): void {
  for (const listener of sessionListeners) {
    listener();
  }
}

function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function emptySubscribe(): () => void {
  return () => undefined;
}

function getSessionSnapshot(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (raw === cachedRawSession) {
    return cachedParsedSession;
  }
  cachedRawSession = raw;
  if (!raw) {
    cachedParsedSession = null;
    return null;
  }
  try {
    cachedParsedSession = JSON.parse(raw) as PersistedSession;
  } catch {
    cachedParsedSession = null;
  }
  return cachedParsedSession;
}

function writeSession(session: PersistedSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    cachedRawSession = null;
    cachedParsedSession = null;
  } else {
    const raw = JSON.stringify(session);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
    cachedRawSession = raw;
    cachedParsedSession = session;
  }
  notifySessionListeners();
}

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { locale } = useTranslations();
  const { setPreference } = useThemePreference();

  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    () => null
  );

  const queryClient = useQueryClient();

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

      queryClient.clear();
      writeSession({
        accessToken: payload.accessToken,
        user: payload.user,
        workspaces: payload.workspaces,
        activeTenantId,
        activeOrganizationId: null,
      });
      setPreference(payload.user.uiThemeMode);
      return activeTenantId;
    },
    [setPreference]
  );

  const selectTenantWorkspace = useCallback((tenantId: string) => {
    const current = getSessionSnapshot();
    if (!current) return;
    writeSession({
      ...current,
      activeTenantId: tenantId,
      activeOrganizationId: null,
    });
  }, []);

  const selectOrganization = useCallback((organizationId: string | null) => {
    const current = getSessionSnapshot();
    if (!current) return;
    writeSession({
      ...current,
      activeOrganizationId: organizationId,
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
    writeSession(null);
    queryClient.clear();
    return endUrl;
  }, [requestContext, session?.accessToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isHydrated,
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
      isHydrated,
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
