// frontend/src/contracts/shell-auth.schemas.ts
/*
Purpose: Defines Zod v4 contracts and TypeScript DTOs for Epic 1 (EP-01)
operations including delegated OIDC auth, Workspace Picker, App Shell
preferences, GET /me/modules manifest, Executive Dashboard, Health Services,
Organization Tree (for fallback recovery), and Global Search.

Context: Authoritative frontend mirror of openapi-platform-core-v1.yaml for
US-01.1 through US-01.5.

Implementation Specs: Uses Zod v4 top-level string format validators (z.uuid(),
z.email(), z.url(), z.iso.datetime({ offset: true })) and optional uiLocale.
*/

import * as z from "zod";
import {
  AuditCategorySchema,
  AuditOutcomeSchema,
  CustomerTypeSchema,
  ModuleSubscriptionStatusSchema,
  OidcProviderTypeSchema,
  OrgStatusSchema,
  OrgTypeSchema,
  ServiceHealthSchema,
  TenantStatusSchema,
  UiThemeModeSchema,
} from "@/contracts/enums";

export const UserUiPreferencesSchema = z.object({
  userId: z.uuid(),
  uiNavPinned: z.boolean(),
  uiThemeMode: UiThemeModeSchema,
  uiLocale: z.string().optional(),
  lastWorkspaceTenantId: z.uuid().nullable().optional(),
  unreadNotificationCount: z.number().int().nonnegative(),
});
export type UserUiPreferences = z.infer<typeof UserUiPreferencesSchema>;

export const UpdateUserUiPreferencesRequestSchema = z.object({
  uiNavPinned: z.boolean().optional(),
  uiThemeMode: UiThemeModeSchema.optional(),
  uiLocale: z.string().optional(),
  lastWorkspaceTenantId: z.uuid().nullable().optional(),
});
export type UpdateUserUiPreferencesRequest = z.infer<
  typeof UpdateUserUiPreferencesRequestSchema
>;

export const OidcDiscoverRequestSchema = z.object({
  workspaceSlug: z.string().optional(),
  email: z.email().optional(),
});
export type OidcDiscoverRequest = z.infer<typeof OidcDiscoverRequestSchema>;

export const OidcDiscoverResponseSchema = z.object({
  providerType: OidcProviderTypeSchema,
  authorizationUrl: z.url(),
  issuerUrl: z.url(),
});
export type OidcDiscoverResponse = z.infer<typeof OidcDiscoverResponseSchema>;

export const OidcCallbackRequestSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
});
export type OidcCallbackRequest = z.infer<typeof OidcCallbackRequestSchema>;

export const WorkspaceSummarySchema = z.object({
  tenantId: z.uuid(),
  tenantCode: z.string(),
  legalName: z.string(),
  customerType: CustomerTypeSchema,
  roleName: z.string(),
  isTenantOwner: z.boolean(),
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;

export const WorkspacesListResponseSchema = z.object({
  items: z.array(WorkspaceSummarySchema),
});
export type WorkspacesListResponse = z.infer<
  typeof WorkspacesListResponseSchema
>;

export const OidcCallbackResponseSchema = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
  user: UserUiPreferencesSchema,
  workspaces: z.array(WorkspaceSummarySchema),
});
export type OidcCallbackResponse = z.infer<typeof OidcCallbackResponseSchema>;

export const LogoutResponseSchema = z.object({
  revoked: z.boolean(),
  oidcEndSessionUrl: z.url().nullable(),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export const SaasModuleSummarySchema = z.object({
  code: z.string(),
  displayName: z.string(),
  description: z.string(),
  apiVersion: z.string(),
  healthStatus: ServiceHealthSchema,
  includedFeatures: z.array(z.string()),
  isCoreService: z.boolean(),
  isActive: z.boolean(),
});
export type SaasModuleSummary = z.infer<typeof SaasModuleSummarySchema>;

export const ServicesHealthResponseSchema = z.object({
  operationalCount: z.number().int(),
  totalCount: z.number().int(),
  services: z.array(SaasModuleSummarySchema),
});
export type ServicesHealthResponse = z.infer<
  typeof ServicesHealthResponseSchema
>;

export const ModuleContextFallbackSchema = z.object({
  fallbackApplied: z.boolean(),
  requestedOrganizationId: z.uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
});
export type ModuleContextFallback = z.infer<typeof ModuleContextFallbackSchema>;

export const AccessibleModuleItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  baseUrl: z.string(),
  themeKey: z.string(),
  apiVersion: z.string(),
  status: ModuleSubscriptionStatusSchema,
  healthStatus: ServiceHealthSchema,
  isCoreService: z.boolean(),
  permittedRoutes: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
  featureFlags: z.record(z.string(), z.boolean()),
});
export type AccessibleModuleItem = z.infer<typeof AccessibleModuleItemSchema>;

export const LockedModuleAddOnSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["NOT_SUBSCRIBED", "SUSPENDED"]),
  manageSubscriptionUrl: z.string(),
  upgradeRequired: z.boolean(),
});
export type LockedModuleAddOn = z.infer<typeof LockedModuleAddOnSchema>;

export const AccessibleModulesManifestResponseSchema = z.object({
  tenantId: z.uuid().nullable(),
  organizationId: z.uuid().nullable(),
  organizationCode: z.string().nullable(),
  organizationName: z.string().nullable(),
  contextFallback: ModuleContextFallbackSchema.nullable(),
  uiPreferences: UserUiPreferencesSchema,
  modules: z.array(AccessibleModuleItemSchema),
  lockedAddOns: z.array(LockedModuleAddOnSchema),
  evaluatedAt: z.iso.datetime({ offset: true }),
});
export type AccessibleModulesManifestResponse = z.infer<
  typeof AccessibleModulesManifestResponseSchema
>;

export const AuditLogSummarySchema = z.object({
  id: z.uuid(),
  eventCode: z.string(),
  tenantId: z.uuid().nullable().optional(),
  organizationId: z.uuid().nullable().optional(),
  actorNameSnapshot: z.string(),
  actorRoleSnapshot: z.string().nullable().optional(),
  serviceSource: z.string(),
  actionCategory: AuditCategorySchema,
  eventAction: z.string(),
  targetResourceType: z.string(),
  targetResourceId: z.string().nullable().optional(),
  outcome: AuditOutcomeSchema,
  httpStatusCode: z.number().int().nullable().optional(),
  otelTraceId: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  retentionUntilOn: z.string(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type AuditLogSummary = z.infer<typeof AuditLogSummarySchema>;

export const TenantQuotaUtilizationSchema = z.object({
  seatLimit: z.number().int(),
  activeSeatsUsed: z.number().int(),
  pendingInviteSeats: z.number().int(),
  orgLimit: z.number().int(),
  activeOrgsUsed: z.number().int(),
  seatUtilizationPct: z.number(),
  orgUtilizationPct: z.number(),
  isSeatNearCap: z.boolean(),
  isOrgNearCap: z.boolean(),
});

export const DashboardTenantRowSchema = z.object({
  id: z.uuid(),
  tenantCode: z.string(),
  legalName: z.string(),
  slug: z.string(),
  customerType: CustomerTypeSchema,
  status: TenantStatusSchema,
  quota: TenantQuotaUtilizationSchema.optional(),
});
export type DashboardTenantRow = z.infer<typeof DashboardTenantRowSchema>;

export const DashboardSummaryResponseSchema = z.object({
  kpis: z.object({
    activeTenants: z.number().int(),
    provisionedOrgs: z.number().int(),
    activeUsers: z.number().int(),
    mfaEnrolledPct: z.number(),
    activeModuleEntitlements: z.number().int(),
  }),
  recentTenants: z.array(DashboardTenantRowSchema),
  governanceAlerts: z.array(
    z.object({
      severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
      title: z.string(),
      detail: z.string(),
    })
  ),
  recentHighRiskAudits: z.array(AuditLogSummarySchema),
});
export type DashboardSummaryResponse = z.infer<
  typeof DashboardSummaryResponseSchema
>;

export const GlobalSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      entityType: z.enum([
        "TENANT",
        "ORGANIZATION",
        "USER",
        "ROLE",
        "AUDIT_EVENT",
      ]),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      href: z.string(),
    })
  ),
});
export type GlobalSearchResponse = z.infer<typeof GlobalSearchResponseSchema>;

export const OrganizationSummarySchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  parentOrgId: z.uuid().nullable().optional(),
  orgCode: z.string(),
  legalName: z.string(),
  orgType: OrgTypeSchema,
  status: OrgStatusSchema,
  memberCount: z.number().int().optional(),
  enabledModules: z.array(z.string()).optional(),
});
export type OrganizationSummary = z.infer<typeof OrganizationSummarySchema>;

export interface OrganizationTreeNode {
  organization: OrganizationSummary;
  children: OrganizationTreeNode[];
}

export const OrganizationTreeNodeSchema: z.ZodType<OrganizationTreeNode> =
  z.lazy(() =>
    z.object({
      organization: OrganizationSummarySchema,
      children: z.array(OrganizationTreeNodeSchema),
    })
  );

export const OrganizationTreeResponseSchema = z.object({
  tenantId: z.uuid(),
  totalVisibleOrgs: z.number().int(),
  roots: z.array(OrganizationTreeNodeSchema),
});
export type OrganizationTreeResponse = z.infer<
  typeof OrganizationTreeResponseSchema
>;
