// src/db/schema/platform-core.ts
//
// Purpose: Defines the canonical PostgreSQL relational schema, enums, constraints, and indexes for the Platform Core Service.
//
// Context: Enforces NOT NULL audit actors, TIMESTAMPTZ/DATE precision, NUMERIC(14,2) monetary safety, and composite same-tenant foreign keys.
//
// Implementation Specs: Drizzle ORM (pgSchema("core")) with 24 tables, 30 enums, paired partial unique indexes, and CHECK constraints.

import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  smallint,
  numeric,
  date,
  time,
  timestamp,
  jsonb,
  inet,
  primaryKey,
  unique,
  uniqueIndex,
  index,
  foreignKey,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Dedicated PostgreSQL schema owned exclusively by the Advantax Tax METRix Platform Core Service. */
export const coreSchema = pgSchema('core');

const auditColumns = () => ({
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 30 PostgreSQL Enums (1:1 parity with Zod & OpenAPI 3.1)
export const customerTypeEnum = coreSchema.enum('customer_type_enum', ['INDIVIDUAL_SMB', 'ENTERPRISE', 'CA_FIRM']);
export const tenantStatusEnum = coreSchema.enum('tenant_status_enum', ['TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const orgTypeEnum = coreSchema.enum('org_type_enum', ['PRIMARY_BUSINESS', 'CORPORATE_HQ', 'SUBSIDIARY', 'BRANCH', 'CA_PRACTICE_HQ', 'CA_CLIENT_ORG']);
export const orgStatusEnum = coreSchema.enum('org_status_enum', ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const userStatusEnum = coreSchema.enum('user_status_enum', ['ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED']);
export const uiThemeModeEnum = coreSchema.enum('ui_theme_mode_enum', ['LIGHT', 'DARK', 'SYSTEM']);
export const oidcProviderTypeEnum = coreSchema.enum('oidc_provider_type_enum', ['MANAGED_OIDC', 'ENTRA_ID_SSO', 'GOOGLE_WORKSPACE_SSO', 'CUSTOM_OIDC']);
export const oidcSyncStatusEnum = coreSchema.enum('oidc_sync_status_enum', ['VERIFIED', 'PENDING_LINK', 'SYNC_ERROR']);
export const invitationStatusEnum = coreSchema.enum('invitation_status_enum', ['SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export const roleScopeEnum = coreSchema.enum('role_scope_enum', ['PLATFORM', 'TENANT', 'ORGANIZATION']);
export const permissionActionEnum = coreSchema.enum('permission_action_enum', ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT', 'MANAGE']);
export const membershipTypeEnum = coreSchema.enum('membership_type_enum', ['INTERNAL_STAFF', 'TENANT_ADMIN', 'CA_PRACTICE_STAFF', 'EXTERNAL_CLIENT_USER']);
export const membershipStatusEnum = coreSchema.enum('membership_status_enum', ['ACTIVE', 'INVITED', 'SUSPENDED', 'EXPIRED', 'REVOKED']);
export const serviceHealthEnum = coreSchema.enum('service_health_enum', ['OPERATIONAL', 'DEGRADED', 'OUTAGE']);
export const billingCycleEnum = coreSchema.enum('billing_cycle_enum', ['MONTHLY', 'ANNUAL']);
export const subscriptionStatusEnum = coreSchema.enum('subscription_status_enum', ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED']);
export const moduleSubscriptionStatusEnum = coreSchema.enum('module_subscription_status_enum', ['ACTIVE', 'TRIAL', 'NOT_SUBSCRIBED', 'UPGRADE_PENDING', 'SUSPENDED']);
export const subscriptionChangeTypeEnum = coreSchema.enum('subscription_change_type_enum', ['UPGRADE', 'DOWNGRADE', 'MODULE_ADDED', 'MODULE_REMOVED', 'QUOTA_ADJUSTED']);
export const changeEffectiveTimingEnum = coreSchema.enum('change_effective_timing_enum', ['IMMEDIATE', 'END_OF_BILLING_CYCLE']);
export const subscriptionChangeStatusEnum = coreSchema.enum('subscription_change_status_enum', ['PREVIEWED', 'SCHEDULED', 'APPLIED', 'CANCELLED']);
export const configCategoryEnum = coreSchema.enum('config_category_enum', ['GENERAL_LOCALIZATION', 'AUTH_OIDC_SSO', 'ISOLATION_QUOTAS', 'FEATURE_FLAGS']);
export const apiKeyStatusEnum = coreSchema.enum('api_key_status_enum', ['ACTIVE', 'ROTATED', 'REVOKED']);
export const webhookStatusEnum = coreSchema.enum('webhook_status_enum', ['ACTIVE', 'PAUSED', 'FAILING']);
export const auditCategoryEnum = coreSchema.enum('audit_category_enum', ['AUTH', 'RBAC', 'SUBSCRIPTION', 'CONFIG', 'TENANCY', 'MODULE_DOMAIN']);
export const auditOutcomeEnum = coreSchema.enum('audit_outcome_enum', ['SUCCESS', 'DENIED', 'FAILED']);
export const notificationChannelEnum = coreSchema.enum('notification_channel_enum', ['IN_APP', 'EMAIL_SES', 'WEBHOOK']);
export const notificationCategoryEnum = coreSchema.enum('notification_category_enum', ['SECURITY_ACCESS', 'TENANCY_ONBOARDING', 'BILLING_QUOTAS', 'SYSTEM_ALERTS']);
export const emailRoutingModeEnum = coreSchema.enum('email_routing_mode_enum', ['OFF', 'ENABLED', 'IMMEDIATE']);
export const deliveryCadenceEnum = coreSchema.enum('delivery_cadence_enum', ['REAL_TIME', 'DAILY_DIGEST']);
export const deliveryStatusEnum = coreSchema.enum('delivery_status_enum', ['QUEUED', 'DELIVERED', 'BOUNCED', 'RETRYING', 'FAILED']);

// 24 Tables inside schema "core"
export const tenants = coreSchema.table(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantCode: varchar('tenant_code', { length: 24 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    customerType: customerTypeEnum('customer_type').notNull(),
    status: tenantStatusEnum('status').default('TRIAL').notNull(),
    primaryRegion: varchar('primary_region', { length: 32 }).default('ap-south-1').notNull(),
    defaultCurrency: varchar('default_currency', { length: 3 }).default('INR').notNull(),
    fyStartMonth: smallint('fy_start_month').default(4).notNull(),
    defaultTimezone: varchar('default_timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
    trialEndsOn: date('trial_ends_on'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_tenants_code').on(t.tenantCode),
    uniqueIndex('uq_tenants_slug').on(t.slug),
    index('idx_tenants_type_status').on(t.customerType, t.status),
    check('chk_tenants_fy_month', sql`${t.fyStartMonth} BETWEEN 1 AND 12`),
    check('chk_tenants_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  ]
);

export const organizations = coreSchema.table(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    parentOrgId: uuid('parent_org_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
    orgCode: varchar('org_code', { length: 24 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }).notNull(),
    orgType: orgTypeEnum('org_type').notNull(),
    taxIdentifiers: jsonb('tax_identifiers').$type<Record<string, string>>().default({}).notNull(),
    status: orgStatusEnum('status').default('ACTIVE').notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_orgs_tenant_code').on(t.tenantId, t.orgCode),
    unique('uq_orgs_tenant_id_id').on(t.tenantId, t.id),
    index('idx_orgs_tenant_parent').on(t.tenantId, t.parentOrgId),
    index('idx_orgs_tenant_type_status').on(t.tenantId, t.orgType, t.status),
  ]
);

export const users = coreSchema.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    primaryTenantId: uuid('primary_tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    isPlatformSuperAdmin: boolean('is_platform_super_admin').default(false).notNull(),
    mfaEnrolled: boolean('mfa_enrolled').default(false).notNull(),
    status: userStatusEnum('status').default('INVITED').notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    uiNavPinned: boolean('ui_nav_pinned').default(false).notNull(),
    uiThemeMode: uiThemeModeEnum('ui_theme_mode').default('LIGHT').notNull(),
    lastWorkspaceTenantId: uuid('last_workspace_tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_users_email').on(t.email),
    index('idx_users_primary_tenant_status').on(t.primaryTenantId, t.status),
    check('chk_users_email_lowercase', sql`${t.email} = LOWER(${t.email})`),
  ]
);

export const userOidcIdentities = coreSchema.table(
  'user_oidc_identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    providerType: oidcProviderTypeEnum('provider_type').default('MANAGED_OIDC').notNull(),
    issuerUrl: varchar('issuer_url', { length: 500 }).notNull(),
    oidcSubject: varchar('oidc_subject', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true }),
    syncStatus: oidcSyncStatusEnum('sync_status').default('VERIFIED').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_oidc_issuer_subject').on(t.issuerUrl, t.oidcSubject),
    index('idx_oidc_user').on(t.userId),
    index('idx_oidc_tenant_provider').on(t.tenantId, t.providerType),
  ]
);

export const userInvitations = coreSchema.table(
  'user_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    targetOrgRoles: jsonb('target_org_roles')
      .$type<Array<{ organizationId: string; roleId: string; accessExpiresOn?: string | null }>>()
      .notNull(),
    welcomeMessage: text('welcome_message'),
    consumesSeatQuota: boolean('consumes_seat_quota').default(true).notNull(),
    status: invitationStatusEnum('status').default('SENT').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedUserId: uuid('accepted_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_invitations_token_hash').on(t.tokenHash),
    index('idx_invitations_tenant_status').on(t.tenantId, t.status),
    index('idx_invitations_tenant_email').on(t.tenantId, t.email),
    check('chk_invitations_email_lowercase', sql`${t.email} = LOWER(${t.email})`),
  ]
);

export const userSessions = coreSchema.table(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    oidcSessionId: varchar('oidc_session_id', { length: 255 }).notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('idx_sessions_user_active').on(t.userId, t.revokedAt, t.expiresAt),
    index('idx_sessions_tenant').on(t.tenantId),
  ]
);

export const saasModules = coreSchema.table('saas_modules', {
  code: varchar('code', { length: 64 }).primaryKey(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  description: text('description').notNull(),
  apiVersion: varchar('api_version', { length: 24 }).notNull(),
  healthStatus: serviceHealthEnum('health_status').default('OPERATIONAL').notNull(),
  includedFeatures: jsonb('included_features').$type<string[]>().default([]).notNull(),
  isCoreService: boolean('is_core_service').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...auditColumns(),
});

export const roles = coreSchema.table(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    scope: roleScopeEnum('scope').notNull(),
    isSystemDefault: boolean('is_system_default').default(false).notNull(),
    clonedFromRoleId: uuid('cloned_from_role_id').references((): AnyPgColumn => roles.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true).notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_roles_global_name').on(t.name).where(sql`${t.tenantId} IS NULL`),
    uniqueIndex('uq_roles_tenant_name').on(t.tenantId, t.name).where(sql`${t.tenantId} IS NOT NULL`),
    index('idx_roles_tenant_scope').on(t.tenantId, t.scope),
    check(
      'chk_roles_system_default_scope',
      sql`(${t.isSystemDefault} = true AND ${t.tenantId} IS NULL) OR (${t.isSystemDefault} = false AND ${t.tenantId} IS NOT NULL)`
    ),
  ]
);

export const permissions = coreSchema.table(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    moduleCode: varchar('module_code', { length: 64 }).notNull().references(() => saasModules.code, { onDelete: 'restrict' }),
    resourceKey: varchar('resource_key', { length: 100 }).notNull(),
    resourceLabel: varchar('resource_label', { length: 140 }).notNull(),
    action: permissionActionEnum('action').notNull(),
    permissionCode: varchar('permission_code', { length: 128 }).notNull(),
    description: text('description'),
    isHighPrivilege: boolean('is_high_privilege').default(false).notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_permissions_code').on(t.permissionCode),
    uniqueIndex('uq_permissions_module_res_action').on(t.moduleCode, t.resourceKey, t.action),
    index('idx_permissions_module').on(t.moduleCode),
  ]
);

export const rolePermissions = coreSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ name: 'pk_role_permissions', columns: [t.roleId, t.permissionId] }),
    index('idx_role_permissions_tenant').on(t.tenantId),
  ]
);

export const organizationMemberships = coreSchema.table(
  'organization_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
    membershipType: membershipTypeEnum('membership_type').default('INTERNAL_STAFF').notNull(),
    status: membershipStatusEnum('status').default('ACTIVE').notNull(),
    accessStartsOn: date('access_starts_on'),
    accessExpiresOn: date('access_expires_on'),
    consumesSeatQuota: boolean('consumes_seat_quota').default(true).notNull(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: 'fk_org_memberships_tenant_org',
      columns: [t.tenantId, t.organizationId],
      foreignColumns: [organizations.tenantId, organizations.id],
    }).onDelete('cascade'),
    uniqueIndex('uq_org_membership_tenant_org_user').on(t.tenantId, t.organizationId, t.userId),
    index('idx_org_membership_user_active').on(t.tenantId, t.userId, t.status),
    index('idx_org_membership_org_status').on(t.tenantId, t.organizationId, t.status),
    check(
      'chk_org_membership_date_window',
      sql`${t.accessStartsOn} IS NULL OR ${t.accessExpiresOn} IS NULL OR ${t.accessExpiresOn} >= ${t.accessStartsOn}`
    ),
  ]
);

export const subscriptionPlans = coreSchema.table(
  'subscription_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    targetCustomerType: customerTypeEnum('target_customer_type').notNull(),
    defaultSeatLimit: integer('default_seat_limit').notNull(),
    defaultOrgLimit: integer('default_org_limit').notNull(),
    annualBasePrice: numeric('annual_base_price', { precision: 14, scale: 2 }).notNull(),
    monthlyBasePrice: numeric('monthly_base_price', { precision: 14, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_subscription_plans_code').on(t.code),
    check('chk_plans_positive_limits', sql`${t.defaultSeatLimit} > 0 AND ${t.defaultOrgLimit} > 0`),
    check('chk_plans_non_negative_price', sql`${t.annualBasePrice} >= 0 AND ${t.monthlyBasePrice} >= 0`),
  ]
);

export const tenantSubscriptions = coreSchema.table(
  'tenant_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id, { onDelete: 'restrict' }),
    billingCycle: billingCycleEnum('billing_cycle').default('ANNUAL').notNull(),
    status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
    contractValue: numeric('contract_value', { precision: 14, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
    seatLimit: integer('seat_limit').notNull(),
    orgLimit: integer('org_limit').notNull(),
    currentPeriodStartOn: date('current_period_start_on').notNull(),
    currentPeriodEndOn: date('current_period_end_on').notNull(),
    renewalDate: date('renewal_date').notNull(),
    trialEndsOn: date('trial_ends_on'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_tenant_subscriptions_tenant').on(t.tenantId),
    check('chk_sub_positive_caps', sql`${t.seatLimit} > 0 AND ${t.orgLimit} > 0`),
    check('chk_sub_period_order', sql`${t.currentPeriodEndOn} >= ${t.currentPeriodStartOn}`),
  ]
);

export const tenantModuleSubscriptions = coreSchema.table(
  'tenant_module_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').notNull().references(() => tenantSubscriptions.id, { onDelete: 'cascade' }),
    moduleCode: varchar('module_code', { length: 64 }).notNull().references(() => saasModules.code, { onDelete: 'restrict' }),
    status: moduleSubscriptionStatusEnum('status').default('ACTIVE').notNull(),
    moduleSeatLimit: integer('module_seat_limit'),
    featureFlags: jsonb('feature_flags').$type<Record<string, boolean>>().default({}).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_tenant_module_sub').on(t.tenantId, t.moduleCode),
    index('idx_tenant_module_status').on(t.tenantId, t.status),
    check('chk_mod_sub_seat_limit', sql`${t.moduleSeatLimit} IS NULL OR ${t.moduleSeatLimit} > 0`),
  ]
);

export const organizationModuleEntitlements = coreSchema.table(
  'organization_module_entitlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    moduleCode: varchar('module_code', { length: 64 }).notNull().references(() => saasModules.code, { onDelete: 'restrict' }),
    isEnabled: boolean('is_enabled').default(false).notNull(),
    allocatedSeatLimit: integer('allocated_seat_limit'),
    featureOverrides: jsonb('feature_overrides').$type<Record<string, boolean>>().default({}).notNull(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: 'fk_org_entitlements_tenant_org',
      columns: [t.tenantId, t.organizationId],
      foreignColumns: [organizations.tenantId, organizations.id],
    }).onDelete('cascade'),
    uniqueIndex('uq_org_module_entitlement').on(t.tenantId, t.organizationId, t.moduleCode),
    index('idx_org_entitlements_enabled').on(t.tenantId, t.moduleCode, t.isEnabled),
    check('chk_org_ent_seat_limit', sql`${t.allocatedSeatLimit} IS NULL OR ${t.allocatedSeatLimit} > 0`),
  ]
);

export const subscriptionChangeLogs = coreSchema.table(
  'subscription_change_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').notNull().references(() => tenantSubscriptions.id, { onDelete: 'cascade' }),
    changeType: subscriptionChangeTypeEnum('change_type').notNull(),
    effectiveTiming: changeEffectiveTimingEnum('effective_timing').default('IMMEDIATE').notNull(),
    effectiveOn: date('effective_on').notNull(),
    previousPlanId: uuid('previous_plan_id').references(() => subscriptionPlans.id),
    newPlanId: uuid('new_plan_id').references(() => subscriptionPlans.id),
    prorationAmount: numeric('proration_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
    impactSummary: jsonb('impact_summary')
      .$type<{
        hardBlockers: string[];
        softWarnings: string[];
        affectedUsersCount: number;
        affectedOrgsCount: number;
        modulesChanged: string[];
      }>()
      .notNull(),
    confirmationTokenTyped: varchar('confirmation_token_typed', { length: 120 }),
    confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    status: subscriptionChangeStatusEnum('status').default('PREVIEWED').notNull(),
    ...auditColumns(),
  },
  (t) => [index('idx_sub_changes_tenant_status').on(t.tenantId, t.status, t.effectiveOn)]
);

export const platformConfigurations = coreSchema.table(
  'platform_configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scopeTenantId: uuid('scope_tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    category: configCategoryEnum('category').notNull(),
    configKey: varchar('config_key', { length: 120 }).notNull(),
    configValue: jsonb('config_value').notNull(),
    isSensitive: boolean('is_sensitive').default(false).notNull(),
    requiresImpactConfirmation: boolean('requires_impact_confirmation').default(false).notNull(),
    version: integer('version').default(1).notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_platform_config_global_key').on(t.configKey).where(sql`${t.scopeTenantId} IS NULL`),
    uniqueIndex('uq_platform_config_tenant_key').on(t.scopeTenantId, t.configKey).where(sql`${t.scopeTenantId} IS NOT NULL`),
    index('idx_platform_config_cat').on(t.scopeTenantId, t.category),
    check('chk_config_positive_version', sql`${t.version} > 0`),
  ]
);

export const apiKeys = coreSchema.table(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 24 }).notNull(),
    keyHash: varchar('key_hash', { length: 128 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().default([]).notNull(),
    status: apiKeyStatusEnum('status').default('ACTIVE').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_api_keys_hash').on(t.keyHash),
    index('idx_api_keys_tenant_status').on(t.tenantId, t.status),
  ]
);

export const webhookEndpoints = coreSchema.table(
  'webhook_endpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    signingSecretEncrypted: text('signing_secret_encrypted').notNull(),
    subscribedEvents: jsonb('subscribed_events').$type<string[]>().default([]).notNull(),
    status: webhookStatusEnum('status').default('ACTIVE').notNull(),
    lastDeliveryHttpCode: smallint('last_delivery_http_code'),
    lastDeliveredAt: timestamp('last_delivered_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index('idx_webhooks_tenant_status').on(t.tenantId, t.status)]
);

export const auditLogs = coreSchema.table(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventCode: varchar('event_code', { length: 32 }).notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorOidcSub: varchar('actor_oidc_sub', { length: 255 }),
    actorNameSnapshot: varchar('actor_name_snapshot', { length: 160 }).notNull(),
    actorRoleSnapshot: varchar('actor_role_snapshot', { length: 120 }),
    serviceSource: varchar('service_source', { length: 64 }).notNull().references(() => saasModules.code, { onDelete: 'restrict' }),
    actionCategory: auditCategoryEnum('action_category').notNull(),
    eventAction: varchar('event_action', { length: 120 }).notNull(),
    targetResourceType: varchar('target_resource_type', { length: 80 }).notNull(),
    targetResourceId: varchar('target_resource_id', { length: 128 }),
    outcome: auditOutcomeEnum('outcome').notNull(),
    httpStatusCode: smallint('http_status_code'),
    otelTraceId: varchar('otel_trace_id', { length: 64 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    retentionUntilOn: date('retention_until_on').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_audit_logs_event_code').on(t.eventCode),
    index('idx_audit_tenant_created').on(t.tenantId, t.createdAt),
    index('idx_audit_org_created').on(t.tenantId, t.organizationId, t.createdAt),
    index('idx_audit_service_cat_outcome').on(t.serviceSource, t.actionCategory, t.outcome),
    index('idx_audit_otel_trace').on(t.otelTraceId),
  ]
);

export const notificationChannelConfigs = coreSchema.table(
  'notification_channel_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    providerName: varchar('provider_name', { length: 120 }).notNull(),
    status: serviceHealthEnum('status').default('OPERATIONAL').notNull(),
    configJson: jsonb('config_json').default({}).notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_notif_channel_global').on(t.channel).where(sql`${t.tenantId} IS NULL`),
    uniqueIndex('uq_notif_channel_tenant').on(t.tenantId, t.channel).where(sql`${t.tenantId} IS NOT NULL`),
  ]
);

export const notificationRoutingRules = coreSchema.table(
  'notification_routing_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    eventKey: varchar('event_key', { length: 120 }).notNull(),
    eventLabel: varchar('event_label', { length: 160 }).notNull(),
    eventCategory: notificationCategoryEnum('event_category').notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    emailMode: emailRoutingModeEnum('email_mode').default('ENABLED').notNull(),
    webhookEnabled: boolean('webhook_enabled').default(false).notNull(),
    recipientRoleNames: jsonb('recipient_role_names').$type<string[]>().default([]).notNull(),
    templateSubject: varchar('template_subject', { length: 240 }).notNull(),
    templateBody: text('template_body').notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_notif_rule_global_event').on(t.eventKey).where(sql`${t.tenantId} IS NULL`),
    uniqueIndex('uq_notif_rule_tenant_event').on(t.tenantId, t.eventKey).where(sql`${t.tenantId} IS NOT NULL`),
  ]
);

export const userNotificationPreferences = coreSchema.table(
  'user_notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    eventCategory: notificationCategoryEnum('event_category').notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    deliveryCadence: deliveryCadenceEnum('delivery_cadence').default('REAL_TIME').notNull(),
    digestTimeLocal: time('digest_time_local').default('09:00:00'),
    digestTimezone: varchar('digest_timezone', { length: 64 }).default('Asia/Kolkata').notNull(),
    muteNonCritical: boolean('mute_non_critical').default(false).notNull(),
    muteStartLocal: time('mute_start_local'),
    muteEndLocal: time('mute_end_local'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('uq_user_notif_pref_global').on(t.userId, t.eventCategory).where(sql`${t.tenantId} IS NULL`),
    uniqueIndex('uq_user_notif_pref_tenant').on(t.userId, t.tenantId, t.eventCategory).where(sql`${t.tenantId} IS NOT NULL`),
  ]
);

export const notificationDeliveries = coreSchema.table(
  'notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    recipientUserId: uuid('recipient_user_id').references(() => users.id, { onDelete: 'cascade' }),
    eventKey: varchar('event_key', { length: 120 }).notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    subject: varchar('subject', { length: 240 }).notNull(),
    payload: jsonb('payload').default({}).notNull(),
    deliveryStatus: deliveryStatusEnum('delivery_status').default('QUEUED').notNull(),
    bullmqJobId: varchar('bullmq_job_id', { length: 128 }),
    attemptCount: smallint('attempt_count').default(0).notNull(),
    lastError: text('last_error'),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('idx_notif_deliv_recipient_unread').on(t.recipientUserId, t.channel, t.isRead),
    index('idx_notif_deliv_tenant_status').on(t.tenantId, t.deliveryStatus, t.createdAt),
  ]
);
