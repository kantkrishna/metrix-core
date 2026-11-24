// frontend/src/contracts/enums.ts
/*
Purpose: Defines all 30 PostgreSQL-aligned enum constants and Zod v4 schemas
matching openapi-platform-core-v1.yaml.

Context: Guarantees canonical, language-neutral API enum values across all
Platform Core views and satisfies BR-023 and OpenAPI 3.1 contract parity.

Implementation Specs: Exports readonly arrays, Zod v4 enum schemas, and inferred
TypeScript union types for every backend enum.
*/

import * as z from "zod";

export const CustomerTypeValues = [
  "INDIVIDUAL_SMB",
  "ENTERPRISE",
  "CA_FIRM",
] as const;
export const CustomerTypeSchema = z.enum(CustomerTypeValues);
export type CustomerType = z.infer<typeof CustomerTypeSchema>;

export const TenantStatusValues = [
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export const TenantStatusSchema = z.enum(TenantStatusValues);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const OrgTypeValues = [
  "PRIMARY_BUSINESS",
  "CORPORATE_HQ",
  "SUBSIDIARY",
  "BRANCH",
  "CA_PRACTICE_HQ",
  "CA_CLIENT_ORG",
] as const;
export const OrgTypeSchema = z.enum(OrgTypeValues);
export type OrgType = z.infer<typeof OrgTypeSchema>;

export const OrgStatusValues = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export const OrgStatusSchema = z.enum(OrgStatusValues);
export type OrgStatus = z.infer<typeof OrgStatusSchema>;

export const UserStatusValues = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "DEACTIVATED",
] as const;
export const UserStatusSchema = z.enum(UserStatusValues);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UiThemeModeValues = ["LIGHT", "DARK", "SYSTEM"] as const;
export const UiThemeModeSchema = z.enum(UiThemeModeValues);
export type UiThemeMode = z.infer<typeof UiThemeModeSchema>;

export const OidcProviderTypeValues = [
  "MANAGED_OIDC",
  "ENTRA_ID_SSO",
  "GOOGLE_WORKSPACE_SSO",
  "CUSTOM_OIDC",
] as const;
export const OidcProviderTypeSchema = z.enum(OidcProviderTypeValues);
export type OidcProviderType = z.infer<typeof OidcProviderTypeSchema>;

export const OidcSyncStatusValues = [
  "VERIFIED",
  "PENDING_LINK",
  "SYNC_ERROR",
] as const;
export const OidcSyncStatusSchema = z.enum(OidcSyncStatusValues);
export type OidcSyncStatus = z.infer<typeof OidcSyncStatusSchema>;

export const InvitationStatusValues = [
  "SENT",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;
export const InvitationStatusSchema = z.enum(InvitationStatusValues);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export const RoleScopeValues = ["PLATFORM", "TENANT", "ORGANIZATION"] as const;
export const RoleScopeSchema = z.enum(RoleScopeValues);
export type RoleScope = z.infer<typeof RoleScopeSchema>;

export const PermissionActionValues = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "APPROVE",
  "EXPORT",
  "MANAGE",
] as const;
export const PermissionActionSchema = z.enum(PermissionActionValues);
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

export const MembershipTypeValues = [
  "INTERNAL_STAFF",
  "TENANT_ADMIN",
  "CA_PRACTICE_STAFF",
  "EXTERNAL_CLIENT_USER",
] as const;
export const MembershipTypeSchema = z.enum(MembershipTypeValues);
export type MembershipType = z.infer<typeof MembershipTypeSchema>;

export const MembershipStatusValues = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "EXPIRED",
  "REVOKED",
] as const;
export const MembershipStatusSchema = z.enum(MembershipStatusValues);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const ServiceHealthValues = [
  "OPERATIONAL",
  "DEGRADED",
  "OUTAGE",
] as const;
export const ServiceHealthSchema = z.enum(ServiceHealthValues);
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;

export const BillingCycleValues = ["MONTHLY", "ANNUAL"] as const;
export const BillingCycleSchema = z.enum(BillingCycleValues);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusValues = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "SUSPENDED",
] as const;
export const SubscriptionStatusSchema = z.enum(SubscriptionStatusValues);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const ModuleSubscriptionStatusValues = [
  "ACTIVE",
  "TRIAL",
  "NOT_SUBSCRIBED",
  "UPGRADE_PENDING",
  "SUSPENDED",
] as const;
export const ModuleSubscriptionStatusSchema = z.enum(
  ModuleSubscriptionStatusValues
);
export type ModuleSubscriptionStatus = z.infer<
  typeof ModuleSubscriptionStatusSchema
>;

export const SubscriptionChangeTypeValues = [
  "UPGRADE",
  "DOWNGRADE",
  "MODULE_ADDED",
  "MODULE_REMOVED",
  "QUOTA_ADJUSTED",
] as const;
export const SubscriptionChangeTypeSchema = z.enum(
  SubscriptionChangeTypeValues
);
export type SubscriptionChangeType = z.infer<
  typeof SubscriptionChangeTypeSchema
>;

export const ChangeEffectiveTimingValues = [
  "IMMEDIATE",
  "END_OF_BILLING_CYCLE",
] as const;
export const ChangeEffectiveTimingSchema = z.enum(ChangeEffectiveTimingValues);
export type ChangeEffectiveTiming = z.infer<typeof ChangeEffectiveTimingSchema>;

export const SubscriptionChangeStatusValues = [
  "PREVIEWED",
  "SCHEDULED",
  "APPLIED",
  "CANCELLED",
] as const;
export const SubscriptionChangeStatusSchema = z.enum(
  SubscriptionChangeStatusValues
);
export type SubscriptionChangeStatus = z.infer<
  typeof SubscriptionChangeStatusSchema
>;

export const ConfigCategoryValues = [
  "GENERAL_LOCALIZATION",
  "AUTH_OIDC_SSO",
  "ISOLATION_QUOTAS",
  "FEATURE_FLAGS",
] as const;
export const ConfigCategorySchema = z.enum(ConfigCategoryValues);
export type ConfigCategory = z.infer<typeof ConfigCategorySchema>;

export const ApiKeyStatusValues = ["ACTIVE", "ROTATED", "REVOKED"] as const;
export const ApiKeyStatusSchema = z.enum(ApiKeyStatusValues);
export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;

export const WebhookStatusValues = ["ACTIVE", "PAUSED", "FAILING"] as const;
export const WebhookStatusSchema = z.enum(WebhookStatusValues);
export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;

export const AuditCategoryValues = [
  "AUTH",
  "RBAC",
  "SUBSCRIPTION",
  "CONFIG",
  "TENANCY",
  "MODULE_DOMAIN",
] as const;
export const AuditCategorySchema = z.enum(AuditCategoryValues);
export type AuditCategory = z.infer<typeof AuditCategorySchema>;

export const AuditOutcomeValues = ["SUCCESS", "DENIED", "FAILED"] as const;
export const AuditOutcomeSchema = z.enum(AuditOutcomeValues);
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;

export const NotificationChannelValues = [
  "IN_APP",
  "EMAIL_SES",
  "WEBHOOK",
] as const;
export const NotificationChannelSchema = z.enum(NotificationChannelValues);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationCategoryValues = [
  "SECURITY_ACCESS",
  "TENANCY_ONBOARDING",
  "BILLING_QUOTAS",
  "SYSTEM_ALERTS",
] as const;
export const NotificationCategorySchema = z.enum(NotificationCategoryValues);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const EmailRoutingModeValues = ["OFF", "ENABLED", "IMMEDIATE"] as const;
export const EmailRoutingModeSchema = z.enum(EmailRoutingModeValues);
export type EmailRoutingMode = z.infer<typeof EmailRoutingModeSchema>;

export const DeliveryCadenceValues = ["REAL_TIME", "DAILY_DIGEST"] as const;
export const DeliveryCadenceSchema = z.enum(DeliveryCadenceValues);
export type DeliveryCadence = z.infer<typeof DeliveryCadenceSchema>;

export const DeliveryStatusValues = [
  "QUEUED",
  "DELIVERED",
  "BOUNCED",
  "RETRYING",
  "FAILED",
] as const;
export const DeliveryStatusSchema = z.enum(DeliveryStatusValues);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
