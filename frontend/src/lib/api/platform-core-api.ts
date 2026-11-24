// metrix-core/frontend/src/lib/api/platform-core-api.ts
/*
Purpose: Exposes typed, UI-only REST client methods for Epic 1 Platform Core
operations against openapi-platform-core-v1.yaml.

Context: Delegates all authentication, RBAC, entitlement, KPI aggregation, and
RLS filtering strictly to the NestJS backend microservice.

Implementation Specs: Wraps PlatformCoreHttpClient with Zod v4 response schema
validation and per-call RequestContext propagation.
*/

import {
  AccessibleModulesManifestResponseSchema,
  DashboardSummaryResponseSchema,
  GlobalSearchResponseSchema,
  LogoutResponseSchema,
  OidcCallbackResponseSchema,
  OidcDiscoverResponseSchema,
  OrganizationTreeResponseSchema,
  ServicesHealthResponseSchema,
  UserUiPreferencesSchema,
  WorkspacesListResponseSchema,
  type AccessibleModulesManifestResponse,
  type DashboardSummaryResponse,
  type GlobalSearchResponse,
  type LogoutResponse,
  type OidcCallbackRequest,
  type OidcCallbackResponse,
  type OidcDiscoverRequest,
  type OidcDiscoverResponse,
  type OrganizationTreeResponse,
  type ServicesHealthResponse,
  type UpdateUserUiPreferencesRequest,
  type UserUiPreferences,
  type WorkspacesListResponse,
} from "@/contracts/shell-auth.schemas";
import {
  platformCoreApi,
  type PlatformCoreHttpClient,
  type RequestContext,
} from "@/lib/api/http-client";

export function createPlatformCoreClient(
  http: PlatformCoreHttpClient = platformCoreApi
) {
  return {
    discoverOidc(
      payload: OidcDiscoverRequest
    ): Promise<OidcDiscoverResponse> {
      return http.request({
        method: "POST",
        path: "/auth/oidc/discover",
        body: payload,
        schema: OidcDiscoverResponseSchema,
      });
    },

    completeOidcCallback(
      payload: OidcCallbackRequest
    ): Promise<OidcCallbackResponse> {
      return http.request({
        method: "POST",
        path: "/auth/oidc/callback",
        body: payload,
        schema: OidcCallbackResponseSchema,
      });
    },

    listWorkspaces(context?: RequestContext): Promise<WorkspacesListResponse> {
      return http.request({
        path: "/auth/workspaces",
        context,
        schema: WorkspacesListResponseSchema,
      });
    },

    logout(context?: RequestContext): Promise<LogoutResponse> {
      return http.request({
        method: "POST",
        path: "/auth/logout",
        context,
        schema: LogoutResponseSchema,
      });
    },

    getUiPreferences(context?: RequestContext): Promise<UserUiPreferences> {
      return http.request({
        path: "/me/preferences",
        context,
        schema: UserUiPreferencesSchema,
      });
    },

    updateUiPreferences(
      payload: UpdateUserUiPreferencesRequest,
      context?: RequestContext
    ): Promise<UserUiPreferences> {
      return http.request({
        method: "PATCH",
        path: "/me/preferences",
        body: payload,
        context,
        schema: UserUiPreferencesSchema,
      });
    },

    getAccessibleModules(
      params: { organizationId?: string | null; includeLockedAddOns?: boolean },
      context?: RequestContext
    ): Promise<AccessibleModulesManifestResponse> {
      return http.request({
        path: "/me/modules",
        query: {
          organizationId: params.organizationId ?? undefined,
          includeLockedAddOns: params.includeLockedAddOns ?? true,
        },
        context,
        schema: AccessibleModulesManifestResponseSchema,
      });
    },

    getDashboardSummary(
      windowDays: 7 | 30 | 90 = 30,
      context?: RequestContext
    ): Promise<DashboardSummaryResponse> {
      return http.request({
        path: "/dashboard/summary",
        query: { windowDays },
        context,
        schema: DashboardSummaryResponseSchema,
      });
    },

    globalSearch(
      q: string,
      limit = 10,
      context?: RequestContext
    ): Promise<GlobalSearchResponse> {
      return http.request({
        path: "/search",
        query: { q, limit },
        context,
        schema: GlobalSearchResponseSchema,
      });
    },

    getServicesHealth(
      context?: RequestContext
    ): Promise<ServicesHealthResponse> {
      return http.request({
        path: "/health/services",
        context,
        schema: ServicesHealthResponseSchema,
      });
    },

    getOrganizationTree(
      context?: RequestContext
    ): Promise<OrganizationTreeResponse> {
      return http.request({
        path: "/organizations/tree",
        context,
        schema: OrganizationTreeResponseSchema,
      });
    },
  };
}

export const coreApi = createPlatformCoreClient();
