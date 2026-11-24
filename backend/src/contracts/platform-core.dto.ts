// backend/src/contracts/platform-core.dto.ts
//
// Purpose: Defines request validation and App Shell module manifest response DTOs across all Platform Core API journeys.
//
// Context: Guarantees runtime contract parity with OpenAPI 3.1 including safe query boolean parsing and locked add-on bounds for GET /me/modules.
//
// Implementation Specs: Zod v4 schemas and inferred TypeScript types covering App Shell preferences/modules, tenancy, invitations, RBAC, memberships, billing, config, and notifications.

import { z } from 'zod';
import {
  BillingCycleSchema,
  ChangeEffectiveTimingSchema,
  CustomerTypeSchema,
  DeliveryCadenceSchema,
  EmailRoutingModeSchema,
  MembershipStatusSchema,
  MembershipTypeSchema,
  ModuleSubscriptionStatusSchema,
  NotificationCategorySchema,
  OrgStatusSchema,
  OrgTypeSchema,
  RoleScopeSchema,
  ServiceHealthSchema,
  UiThemeModeSchema,
  WebhookStatusSchema,
} from './enums';
import { IsoDateSchema, LocalWallTimeSchema, TenantSlugSchema } from './common.dto';

export const UserUiPreferencesDto = z.object({
  userId: z.string().uuid(),
  uiNavPinned: z.boolean(),
  uiThemeMode: UiThemeModeSchema,
  lastWorkspaceTenantId: z.string().uuid().nullable().optional(),
  unreadNotificationCount: z.number().int().min(0),
});

export const UpdateUiPreferencesDto = z.object({
  uiNavPinned: z.boolean().optional(),
  uiThemeMode: UiThemeModeSchema.optional(),
  lastWorkspaceTenantId: z.string().uuid().nullable().optional(),
});

export const GetMyModulesQueryDto = z.object({
  organizationId: z.string().uuid().optional(),
  includeLockedAddOns: z
    .preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
    .default(false),
});

export const ModuleContextFallbackDto = z.object({
  fallbackApplied: z.boolean(),
  requestedOrganizationId: z.string().uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export const AccessibleModuleItemDto = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  description: z.string(),
  baseUrl: z.string().startsWith('/'),
  themeKey: z.string().min(2).max(32),
  apiVersion: z.string().min(1).max(24),
  status: ModuleSubscriptionStatusSchema,
  healthStatus: ServiceHealthSchema,
  isCoreService: z.boolean(),
  permittedRoutes: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
  featureFlags: z.record(z.string(), z.boolean()),
});

export const LockedModuleAddOnDto = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  description: z.string(),
  status: z.enum(['NOT_SUBSCRIBED', 'SUSPENDED']),
  manageSubscriptionUrl: z.string().startsWith('/'),
  upgradeRequired: z.boolean(),
});

export const AccessibleModulesManifestResponseDto = z.object({
  tenantId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),
  organizationCode: z.string().nullable(),
  organizationName: z.string().nullable(),
  contextFallback: ModuleContextFallbackDto.nullable(),
  uiPreferences: UserUiPreferencesDto,
  modules: z.array(AccessibleModuleItemDto),
  lockedAddOns: z.array(LockedModuleAddOnDto),
  evaluatedAt: z.string().datetime(),
});

export type GetMyModulesQuery = z.infer<typeof GetMyModulesQueryDto>;
export type AccessibleModuleItem = z.infer<typeof AccessibleModuleItemDto>;
export type LockedModuleAddOn = z.infer<typeof LockedModuleAddOnDto>;
export type AccessibleModulesManifestResponse = z.infer<typeof AccessibleModulesManifestResponseDto>;

export const CreateOrganizationDto = z.object({
  parentOrgId: z.string().uuid().nullable().optional(),
  orgCode: z.string().trim().max(24).optional(),
  legalName: z.string().trim().min(2).max(200),
  orgType: OrgTypeSchema,
  taxIdentifiers: z.record(z.string(), z.string()).default({}),
});

export const UpdateOrganizationDto = z.object({
  legalName: z.string().trim().min(2).max(200).optional(),
  taxIdentifiers: z.record(z.string(), z.string()).optional(),
  status: OrgStatusSchema.optional(),
});

export const OnboardTenantDto = z.object({
  customerType: CustomerTypeSchema,
  legalName: z.string().trim().min(2).max(200),
  slug: TenantSlugSchema,
  primaryRegion: z.string().default('ap-south-1'),
  defaultCurrency: z.string().length(3).default('INR'),
  fyStartMonth: z.number().int().min(1).max(12).default(4),
  defaultTimezone: z.string().default('Asia/Kolkata'),
  initialOrganizations: z.array(CreateOrganizationDto).default([]),
  primaryAdmin: z.object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().max(32).nullable().optional(),
  }),
  planCode: z.string().min(2).max(64),
  billingCycle: BillingCycleSchema,
  initialModules: z.array(z.enum(['tax_financial', 'payroll_hrms', 'ca_practice'])).default([]),
});

export const TargetOrgRoleDto = z.object({
  organizationId: z.string().uuid(),
  roleId: z.string().uuid(),
  accessExpiresOn: IsoDateSchema.nullable().optional(),
});

export const CreateInvitationsDto = z.object({
  emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(50),
  targetOrgRoles: z.array(TargetOrgRoleDto).min(1),
  welcomeMessage: z.string().max(500).nullable().optional(),
  consumesSeatQuota: z.boolean().default(true),
});

export const UpsertRoleDto = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  scope: RoleScopeSchema,
  permissionIds: z.array(z.string().uuid()).min(1),
});

export const BulkAssignMembershipsDto = z.object({
  userId: z.string().uuid(),
  membershipType: MembershipTypeSchema.default('INTERNAL_STAFF'),
  assignments: z.array(TargetOrgRoleDto).min(1),
});

export const UpdateMembershipDto = z.object({
  roleId: z.string().uuid().optional(),
  status: MembershipStatusSchema.optional(),
  accessStartsOn: IsoDateSchema.nullable().optional(),
  accessExpiresOn: IsoDateSchema.nullable().optional(),
});

export const UpdateOrgEntitlementDto = z.object({
  isEnabled: z.boolean(),
  allocatedSeatLimit: z.number().int().min(1).nullable().optional(),
  featureOverrides: z.record(z.string(), z.boolean()).optional(),
});

export const PreviewSubscriptionChangeDto = z.object({
  targetPlanCode: z.string().optional(),
  billingCycle: BillingCycleSchema.optional(),
  targetSeatLimit: z.number().int().min(1).optional(),
  targetOrgLimit: z.number().int().min(1).optional(),
  enableModules: z.array(z.string()).optional(),
  disableModules: z.array(z.string()).optional(),
  effectiveTiming: ChangeEffectiveTimingSchema,
});

export const ConfirmSubscriptionChangeDto = z.object({
  changeLogId: z.string().uuid(),
  acknowledgedSoftWarnings: z.boolean(),
  confirmationTokenTyped: z.string().nullable().optional(),
});

export const UpdatePlatformConfigDto = z.object({
  configKey: z.string().min(2).max(120),
  configValue: z.record(z.string(), z.unknown()),
  expectedVersion: z.number().int().min(1),
  impactConfirmed: z.boolean().default(false),
});

export const CreateApiKeyDto = z.object({
  name: z.string().trim().min(2).max(120),
  scopes: z.array(z.string().min(3)).min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const UpdateWebhookDto = z.object({
  url: z.string().url().optional(),
  subscribedEvents: z.array(z.string()).optional(),
  status: WebhookStatusSchema.optional(),
});

export const UpdateNotificationRuleDto = z.object({
  inAppEnabled: z.boolean().optional(),
  emailMode: EmailRoutingModeSchema.optional(),
  webhookEnabled: z.boolean().optional(),
  recipientRoleNames: z.array(z.string()).optional(),
  templateSubject: z.string().max(240).optional(),
  templateBody: z.string().optional(),
});

export const UpsertUserNotificationPreferenceDto = z.object({
  eventCategory: NotificationCategorySchema,
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  deliveryCadence: DeliveryCadenceSchema,
  digestTimeLocal: LocalWallTimeSchema.nullable().optional(),
  digestTimezone: z.string().default('Asia/Kolkata'),
  muteNonCritical: z.boolean(),
  muteStartLocal: LocalWallTimeSchema.nullable().optional(),
  muteEndLocal: LocalWallTimeSchema.nullable().optional(),
});
