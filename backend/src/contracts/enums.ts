// src/contracts/enums.ts
//
// Purpose: Exports Zod validation schemas mirroring all 30 PostgreSQL enums defined in the Platform Core database schema.
//
// Context: Prevents drift between database constraints, NestJS request/response validation, and OpenAPI 3.1 enum schemas.
//
// Implementation Specs: Zod v4 z.enum() definitions aligned 1:1 with coreSchema.enum() in src/db/schema/platform-core.ts.

import { z } from 'zod';

/** Canonical 30-enum registry aligned 1:1 with Drizzle PostgreSQL schema & OpenAPI 3.1. */
export const CustomerTypeSchema = z.enum(['INDIVIDUAL_SMB', 'ENTERPRISE', 'CA_FIRM']);
export const TenantStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const OrgTypeSchema = z.enum(['PRIMARY_BUSINESS', 'CORPORATE_HQ', 'SUBSIDIARY', 'BRANCH', 'CA_PRACTICE_HQ', 'CA_CLIENT_ORG']);
export const OrgStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const UserStatusSchema = z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED']);
export const UiThemeModeSchema = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
export const OidcProviderTypeSchema = z.enum(['MANAGED_OIDC', 'ENTRA_ID_SSO', 'GOOGLE_WORKSPACE_SSO', 'CUSTOM_OIDC']);
export const OidcSyncStatusSchema = z.enum(['VERIFIED', 'PENDING_LINK', 'SYNC_ERROR']);
export const InvitationStatusSchema = z.enum(['SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export const RoleScopeSchema = z.enum(['PLATFORM', 'TENANT', 'ORGANIZATION']);
export const PermissionActionSchema = z.enum(['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT', 'MANAGE']);
export const MembershipTypeSchema = z.enum(['INTERNAL_STAFF', 'TENANT_ADMIN', 'CA_PRACTICE_STAFF', 'EXTERNAL_CLIENT_USER']);
export const MembershipStatusSchema = z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'EXPIRED', 'REVOKED']);
export const ServiceHealthSchema = z.enum(['OPERATIONAL', 'DEGRADED', 'OUTAGE']);
export const BillingCycleSchema = z.enum(['MONTHLY', 'ANNUAL']);
export const SubscriptionStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED']);
export const ModuleSubscriptionStatusSchema = z.enum(['ACTIVE', 'TRIAL', 'NOT_SUBSCRIBED', 'UPGRADE_PENDING', 'SUSPENDED']);
export const SubscriptionChangeTypeSchema = z.enum(['UPGRADE', 'DOWNGRADE', 'MODULE_ADDED', 'MODULE_REMOVED', 'QUOTA_ADJUSTED']);
export const ChangeEffectiveTimingSchema = z.enum(['IMMEDIATE', 'END_OF_BILLING_CYCLE']);
export const SubscriptionChangeStatusSchema = z.enum(['PREVIEWED', 'SCHEDULED', 'APPLIED', 'CANCELLED']);
export const ConfigCategorySchema = z.enum(['GENERAL_LOCALIZATION', 'AUTH_OIDC_SSO', 'ISOLATION_QUOTAS', 'FEATURE_FLAGS']);
export const ApiKeyStatusSchema = z.enum(['ACTIVE', 'ROTATED', 'REVOKED']);
export const WebhookStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'FAILING']);
export const AuditCategorySchema = z.enum(['AUTH', 'RBAC', 'SUBSCRIPTION', 'CONFIG', 'TENANCY', 'MODULE_DOMAIN']);
export const AuditOutcomeSchema = z.enum(['SUCCESS', 'DENIED', 'FAILED']);
export const NotificationChannelSchema = z.enum(['IN_APP', 'EMAIL_SES', 'WEBHOOK']);
export const NotificationCategorySchema = z.enum(['SECURITY_ACCESS', 'TENANCY_ONBOARDING', 'BILLING_QUOTAS', 'SYSTEM_ALERTS']);
export const EmailRoutingModeSchema = z.enum(['OFF', 'ENABLED', 'IMMEDIATE']);
export const DeliveryCadenceSchema = z.enum(['REAL_TIME', 'DAILY_DIGEST']);
export const DeliveryStatusSchema = z.enum(['QUEUED', 'DELIVERED', 'BOUNCED', 'RETRYING', 'FAILED']);
