-- backend/drizzle/migrations/0001_platform_core_rls_and_views.sql
--
-- Purpose: Configures metrix_app (NOBYPASSRLS) runtime grants, 21 FORCE ROW LEVEL SECURITY
-- tables (25 policies), statement-level audit immutability, updated_at triggers, operational
-- security_invoker views, and comprehensive PostgreSQL catalog comments for all core objects.
--
-- Context: Executed by npm run db:migrate:rls (via scripts/apply-rls.ts) as metrix_owner
-- immediately after drizzle-kit push during npm run db:bootstrap.
--
-- Implementation Specs: Idempotent PostgreSQL 16 DDL covering schema core, 30 enum types,
-- 24 tables, all table/view columns, 2 views, 8 functions, 24 triggers, and 25 RLS policies.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. VERIFY NON-SUPERUSER APPLICATION RUNTIME ROLE & SCHEMA GRANTS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metrix_app') THEN
    CREATE ROLE metrix_app LOGIN PASSWORD 'metrix_app_dev_pwd'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA core TO metrix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO metrix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO metrix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA core
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO metrix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA core
  GRANT USAGE, SELECT ON SEQUENCES TO metrix_app;

-- ----------------------------------------------------------------------------
-- 2. TRANSACTION-SCOPED RLS CONTEXT HELPERS (SET LOCAL SAFE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.ctx_is_super_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_platform_super_admin', true), ''), 'false')::boolean;
$$;

CREATE OR REPLACE FUNCTION core.ctx_tenant_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION core.ctx_user_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION core.ctx_is_tenant_owner() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_tenant_owner', true), ''), 'false')::boolean;
$$;

CREATE OR REPLACE FUNCTION core.ctx_has_org_access(p_tenant_id UUID, p_org_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = core, pg_catalog AS $$
  SELECT
    core.ctx_is_super_admin()
    OR (
      p_tenant_id = core.ctx_tenant_id()
      AND (
        core.ctx_is_tenant_owner()
        OR EXISTS (
          SELECT 1
          FROM core.organization_memberships m
          WHERE m.tenant_id = p_tenant_id
            AND m.organization_id = p_org_id
            AND m.user_id = core.ctx_user_id()
            AND m.status = 'ACTIVE'
            AND (m.access_starts_on IS NULL OR m.access_starts_on <= CURRENT_DATE)
            AND (m.access_expires_on IS NULL OR m.access_expires_on >= CURRENT_DATE)
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION core.ctx_can_access_user(p_user_id UUID, p_primary_tenant_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = core, pg_catalog AS $$
  SELECT
    core.ctx_is_super_admin()
    OR p_user_id = core.ctx_user_id()
    OR p_primary_tenant_id = core.ctx_tenant_id()
    OR EXISTS (
      SELECT 1
      FROM core.organization_memberships m
      WHERE m.user_id = p_user_id
        AND m.tenant_id = core.ctx_tenant_id()
    );
$$;

GRANT EXECUTE ON FUNCTION core.ctx_is_super_admin() TO metrix_app;
GRANT EXECUTE ON FUNCTION core.ctx_tenant_id() TO metrix_app;
GRANT EXECUTE ON FUNCTION core.ctx_user_id() TO metrix_app;
GRANT EXECUTE ON FUNCTION core.ctx_is_tenant_owner() TO metrix_app;
GRANT EXECUTE ON FUNCTION core.ctx_has_org_access(UUID, UUID) TO metrix_app;
GRANT EXECUTE ON FUNCTION core.ctx_can_access_user(UUID, UUID) TO metrix_app;

-- ----------------------------------------------------------------------------
-- 3. ENABLE & FORCE ROW-LEVEL SECURITY (21 TABLES — 25 POLICIES)
-- ----------------------------------------------------------------------------
ALTER TABLE core.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenants_isolation ON core.tenants;
CREATE POLICY rls_tenants_isolation ON core.tenants
  USING (core.ctx_is_super_admin() OR id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR id = core.ctx_tenant_id());

ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_organizations_org_isolation ON core.organizations;
CREATE POLICY rls_organizations_org_isolation ON core.organizations
  USING (core.ctx_has_org_access(tenant_id, id))
  WITH CHECK (
    core.ctx_is_super_admin()
    OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner())
  );

ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_users_isolation ON core.users;
CREATE POLICY rls_users_isolation ON core.users
  USING (core.ctx_can_access_user(id, primary_tenant_id))
  WITH CHECK (
    core.ctx_is_super_admin()
    OR id = core.ctx_user_id()
    OR (core.ctx_is_tenant_owner() AND primary_tenant_id = core.ctx_tenant_id())
  );

ALTER TABLE core.user_oidc_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_oidc_identities FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_user_oidc_isolation ON core.user_oidc_identities;
CREATE POLICY rls_user_oidc_isolation ON core.user_oidc_identities
  USING (
    core.ctx_is_super_admin()
    OR user_id = core.ctx_user_id()
    OR tenant_id = core.ctx_tenant_id()
  )
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_invitations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_invitations_isolation ON core.user_invitations;
CREATE POLICY rls_invitations_isolation ON core.user_invitations
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sessions_isolation ON core.user_sessions;
CREATE POLICY rls_sessions_isolation ON core.user_sessions
  USING (
    core.ctx_is_super_admin()
    OR user_id = core.ctx_user_id()
    OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id())
  )
  WITH CHECK (
    core.ctx_is_super_admin()
    OR user_id = core.ctx_user_id()
    OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id())
  );

ALTER TABLE core.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_roles_select ON core.roles;
CREATE POLICY rls_roles_select ON core.roles FOR SELECT
  USING (
    core.ctx_is_super_admin()
    OR is_system_default = true
    OR tenant_id = core.ctx_tenant_id()
  );
DROP POLICY IF EXISTS rls_roles_write ON core.roles;
CREATE POLICY rls_roles_write ON core.roles FOR ALL
  USING (core.ctx_is_super_admin() OR (is_system_default = false AND tenant_id = core.ctx_tenant_id()))
  WITH CHECK (core.ctx_is_super_admin() OR (is_system_default = false AND tenant_id = core.ctx_tenant_id()));

ALTER TABLE core.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_role_permissions_select ON core.role_permissions;
CREATE POLICY rls_role_permissions_select ON core.role_permissions FOR SELECT
  USING (core.ctx_is_super_admin() OR tenant_id IS NULL OR tenant_id = core.ctx_tenant_id());
DROP POLICY IF EXISTS rls_role_permissions_write ON core.role_permissions;
CREATE POLICY rls_role_permissions_write ON core.role_permissions FOR ALL
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organization_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_org_memberships_isolation ON core.organization_memberships;
CREATE POLICY rls_org_memberships_isolation ON core.organization_memberships
  USING (
    core.ctx_is_super_admin()
    OR (
      tenant_id = core.ctx_tenant_id()
      AND (user_id = core.ctx_user_id() OR core.ctx_has_org_access(tenant_id, organization_id))
    )
  )
  WITH CHECK (
    core.ctx_is_super_admin()
    OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner())
  );

ALTER TABLE core.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tenant_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_subs_isolation ON core.tenant_subscriptions;
CREATE POLICY rls_tenant_subs_isolation ON core.tenant_subscriptions
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.tenant_module_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tenant_module_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_mod_subs_isolation ON core.tenant_module_subscriptions;
CREATE POLICY rls_tenant_mod_subs_isolation ON core.tenant_module_subscriptions
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.organization_module_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organization_module_entitlements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_org_entitlements_isolation ON core.organization_module_entitlements;
CREATE POLICY rls_org_entitlements_isolation ON core.organization_module_entitlements
  USING (core.ctx_has_org_access(tenant_id, organization_id))
  WITH CHECK (
    core.ctx_is_super_admin()
    OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner())
  );

ALTER TABLE core.subscription_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.subscription_change_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sub_change_logs_isolation ON core.subscription_change_logs;
CREATE POLICY rls_sub_change_logs_isolation ON core.subscription_change_logs
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.platform_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.platform_configurations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_platform_config_select ON core.platform_configurations;
CREATE POLICY rls_platform_config_select ON core.platform_configurations FOR SELECT
  USING (core.ctx_is_super_admin() OR scope_tenant_id IS NULL OR scope_tenant_id = core.ctx_tenant_id());
DROP POLICY IF EXISTS rls_platform_config_write ON core.platform_configurations;
CREATE POLICY rls_platform_config_write ON core.platform_configurations FOR ALL
  USING (core.ctx_is_super_admin() OR scope_tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR scope_tenant_id = core.ctx_tenant_id());

ALTER TABLE core.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.api_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_api_keys_isolation ON core.api_keys;
CREATE POLICY rls_api_keys_isolation ON core.api_keys
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.webhook_endpoints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_webhooks_isolation ON core.webhook_endpoints;
CREATE POLICY rls_webhooks_isolation ON core.webhook_endpoints
  USING (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_audit_logs_select ON core.audit_logs;
CREATE POLICY rls_audit_logs_select ON core.audit_logs FOR SELECT
  USING (
    core.ctx_is_super_admin()
    OR (
      tenant_id = core.ctx_tenant_id()
      AND (
        core.ctx_is_tenant_owner()
        OR organization_id IS NULL
        OR core.ctx_has_org_access(tenant_id, organization_id)
      )
    )
  );
DROP POLICY IF EXISTS rls_audit_logs_insert ON core.audit_logs;
CREATE POLICY rls_audit_logs_insert ON core.audit_logs FOR INSERT
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.notification_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.notification_channel_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notif_channels_isolation ON core.notification_channel_configs;
CREATE POLICY rls_notif_channels_isolation ON core.notification_channel_configs
  USING (core.ctx_is_super_admin() OR tenant_id IS NULL OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.notification_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.notification_routing_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notif_rules_isolation ON core.notification_routing_rules;
CREATE POLICY rls_notif_rules_isolation ON core.notification_routing_rules
  USING (core.ctx_is_super_admin() OR tenant_id IS NULL OR tenant_id = core.ctx_tenant_id())
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

ALTER TABLE core.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_notification_preferences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_user_notif_prefs_isolation ON core.user_notification_preferences;
CREATE POLICY rls_user_notif_prefs_isolation ON core.user_notification_preferences
  USING (core.ctx_is_super_admin() OR user_id = core.ctx_user_id())
  WITH CHECK (core.ctx_is_super_admin() OR user_id = core.ctx_user_id());

ALTER TABLE core.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.notification_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notif_deliveries_isolation ON core.notification_deliveries;
CREATE POLICY rls_notif_deliveries_isolation ON core.notification_deliveries
  USING (
    core.ctx_is_super_admin()
    OR recipient_user_id = core.ctx_user_id()
    OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id())
  )
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

-- ----------------------------------------------------------------------------
-- 4. IMMUTABLE AUDIT LOG GUARD & AUTOMATIC UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.prevent_audit_log_mutation() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'core.audit_logs is strictly append-only; UPDATE and DELETE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON core.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON core.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION core.prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION core.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants', 'organizations', 'users', 'user_oidc_identities',
    'user_invitations', 'user_sessions', 'saas_modules', 'roles',
    'permissions', 'role_permissions', 'organization_memberships',
    'subscription_plans', 'tenant_subscriptions', 'tenant_module_subscriptions',
    'organization_module_entitlements', 'subscription_change_logs',
    'platform_configurations', 'api_keys', 'webhook_endpoints',
    'notification_channel_configs', 'notification_routing_rules',
    'user_notification_preferences', 'notification_deliveries'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON core.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON core.%I FOR EACH ROW EXECUTE FUNCTION core.touch_updated_at();',
      tbl, tbl
    );
    EXECUTE format(
      'COMMENT ON TRIGGER trg_%I_updated_at ON core.%I IS %L;',
      tbl, tbl, 'Automatically refreshes updated_at to NOW() on every row update.'
    );
    EXECUTE format('COMMENT ON COLUMN core.%I.created_by IS %L;', tbl, 'UUID of the user or system actor that created this record.');
    EXECUTE format('COMMENT ON COLUMN core.%I.created_at IS %L;', tbl, 'UTC timestamp with timezone when this record was created.');
    EXECUTE format('COMMENT ON COLUMN core.%I.updated_by IS %L;', tbl, 'UUID of the user or system actor that last modified this record.');
    EXECUTE format('COMMENT ON COLUMN core.%I.updated_at IS %L;', tbl, 'UTC timestamp with timezone when this record was last modified.');
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. OPERATIONAL VIEWS (security_invoker = true HONORS CALLER RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW core.v_tenant_quota_utilization
WITH (security_invoker = true) AS
SELECT
  t.id AS tenant_id,
  t.tenant_code,
  t.legal_name,
  t.customer_type,
  t.status AS tenant_status,
  ts.seat_limit,
  ts.org_limit,
  COUNT(DISTINCT CASE
    WHEN om.status = 'ACTIVE'
      AND om.consumes_seat_quota = true
      AND (om.access_expires_on IS NULL OR om.access_expires_on >= CURRENT_DATE)
    THEN om.user_id
  END)::int AS active_seats_used,
  (
    SELECT COUNT(*)::int
    FROM core.user_invitations ui
    WHERE ui.tenant_id = t.id
      AND ui.status = 'SENT'
      AND ui.consumes_seat_quota = true
      AND ui.expires_at > NOW()
  ) AS pending_invite_seats,
  COUNT(DISTINCT CASE WHEN o.status = 'ACTIVE' THEN o.id END)::int AS active_orgs_used,
  ROUND(
    (
      COUNT(DISTINCT CASE
        WHEN om.status = 'ACTIVE' AND om.consumes_seat_quota = true
        THEN om.user_id
      END)::numeric / NULLIF(ts.seat_limit, 0)
    ) * 100, 2
  ) AS seat_utilization_pct,
  ROUND(
    (
      COUNT(DISTINCT CASE WHEN o.status = 'ACTIVE' THEN o.id END)::numeric
      / NULLIF(ts.org_limit, 0)
    ) * 100, 2
  ) AS org_utilization_pct,
  (
    COUNT(DISTINCT CASE
      WHEN om.status = 'ACTIVE' AND om.consumes_seat_quota = true
      THEN om.user_id
    END)::numeric / NULLIF(ts.seat_limit, 0) >= 0.90
  ) AS is_seat_near_cap,
  (
    COUNT(DISTINCT CASE WHEN o.status = 'ACTIVE' THEN o.id END)::numeric
    / NULLIF(ts.org_limit, 0) >= 0.90
  ) AS is_org_near_cap
FROM core.tenants t
JOIN core.tenant_subscriptions ts ON ts.tenant_id = t.id
LEFT JOIN core.organizations o ON o.tenant_id = t.id
LEFT JOIN core.organization_memberships om ON om.tenant_id = t.id
GROUP BY t.id, ts.seat_limit, ts.org_limit;

CREATE OR REPLACE VIEW core.v_effective_user_org_permissions
WITH (security_invoker = true) AS
SELECT DISTINCT
  om.tenant_id,
  om.organization_id,
  om.user_id,
  r.id AS role_id,
  r.name AS role_name,
  p.module_code,
  p.permission_code,
  p.resource_key,
  p.action,
  CASE
    WHEN sm.is_core_service = true THEN true
    ELSE COALESCE(ome.is_enabled, false) AND tms.status IN ('ACTIVE', 'TRIAL')
  END AS is_entitlement_active
FROM core.organization_memberships om
JOIN core.roles r ON r.id = om.role_id AND r.is_active = true
JOIN core.role_permissions rp ON rp.role_id = r.id
JOIN core.permissions p ON p.id = rp.permission_id
JOIN core.saas_modules sm ON sm.code = p.module_code
LEFT JOIN core.tenant_module_subscriptions tms
  ON tms.tenant_id = om.tenant_id AND tms.module_code = p.module_code
LEFT JOIN core.organization_module_entitlements ome
  ON ome.tenant_id = om.tenant_id
 AND ome.organization_id = om.organization_id
 AND ome.module_code = p.module_code
WHERE om.status = 'ACTIVE'
  AND (om.access_starts_on IS NULL OR om.access_starts_on <= CURRENT_DATE)
  AND (om.access_expires_on IS NULL OR om.access_expires_on >= CURRENT_DATE);

GRANT SELECT ON core.v_tenant_quota_utilization TO metrix_app;
GRANT SELECT ON core.v_effective_user_org_permissions TO metrix_app;

-- ----------------------------------------------------------------------------
-- 6. POSTGRESQL CATALOG COMMENTS (SCHEMA, 30 ENUMS, 24 TABLES, ALL COLUMNS,
--    2 VIEWS + VIEW COLUMNS, 8 FUNCTIONS, 24 TRIGGERS & 25 RLS POLICIES)
-- ----------------------------------------------------------------------------

-- 6.1 Schema
COMMENT ON SCHEMA core IS 'Advantax Tax METRix Platform Core schema owning tenancy, OIDC links, RBAC, subscriptions, entitlements, config, audit logs, and notifications.';

-- 6.2 Enum Types (30)
COMMENT ON TYPE core.customer_type_enum IS 'Customer archetype classification: INDIVIDUAL_SMB, ENTERPRISE, or CA_FIRM.';
COMMENT ON TYPE core.tenant_status_enum IS 'Lifecycle status of a tenant account: TRIAL, ACTIVE, SUSPENDED, or ARCHIVED.';
COMMENT ON TYPE core.org_type_enum IS 'Structural entity type within a tenant organization hierarchy.';
COMMENT ON TYPE core.org_status_enum IS 'Operational lifecycle status of an individual organization.';
COMMENT ON TYPE core.user_status_enum IS 'Lifecycle state of a platform user account: ACTIVE, INVITED, SUSPENDED, or DEACTIVATED.';
COMMENT ON TYPE core.ui_theme_mode_enum IS 'Persisted user appearance preference: LIGHT, DARK, or SYSTEM.';
COMMENT ON TYPE core.oidc_provider_type_enum IS 'Delegated OIDC/OAuth 2.0 identity provider classification.';
COMMENT ON TYPE core.oidc_sync_status_enum IS 'Synchronization health status of an external OIDC identity mapping.';
COMMENT ON TYPE core.invitation_status_enum IS 'State machine for email-based OIDC user invitations.';
COMMENT ON TYPE core.role_scope_enum IS 'Authorization boundary at which an RBAC role operates: PLATFORM, TENANT, or ORGANIZATION.';
COMMENT ON TYPE core.permission_action_enum IS 'Granular action verb in the RBAC permission matrix.';
COMMENT ON TYPE core.membership_type_enum IS 'Relationship classification of a user within an organization (staff, owner, or external client).';
COMMENT ON TYPE core.membership_status_enum IS 'Activation and expiry lifecycle state of an organization membership.';
COMMENT ON TYPE core.service_health_enum IS 'Operational health indicator for registered microservices and notification channels.';
COMMENT ON TYPE core.billing_cycle_enum IS 'Commercial subscription billing cadence: MONTHLY or ANNUAL.';
COMMENT ON TYPE core.subscription_status_enum IS 'Commercial lifecycle status of a tenant subscription contract.';
COMMENT ON TYPE core.module_subscription_status_enum IS 'Tenant-level commercial entitlement status for an individual SaaS module.';
COMMENT ON TYPE core.subscription_change_type_enum IS 'Category of subscription plan, quota, or module modification.';
COMMENT ON TYPE core.change_effective_timing_enum IS 'Timing policy for applying a confirmed subscription change: IMMEDIATE or END_OF_BILLING_CYCLE.';
COMMENT ON TYPE core.subscription_change_status_enum IS 'Workflow execution state of a subscription change preview or confirmation.';
COMMENT ON TYPE core.config_category_enum IS 'Configuration workspace tab grouping: localization, OIDC/SSO, quotas, or feature flags.';
COMMENT ON TYPE core.api_key_status_enum IS 'Lifecycle state of a scoped machine-to-machine API key.';
COMMENT ON TYPE core.webhook_status_enum IS 'Operational delivery state of an outbound HTTPS webhook endpoint.';
COMMENT ON TYPE core.audit_category_enum IS 'High-level compliance filter category for centralized audit log events.';
COMMENT ON TYPE core.audit_outcome_enum IS 'Execution result of an audited operation: SUCCESS, DENIED, or FAILED.';
COMMENT ON TYPE core.notification_channel_enum IS 'Supported notification transport channels: IN_APP, EMAIL_SES, or WEBHOOK.';
COMMENT ON TYPE core.notification_category_enum IS 'User-facing notification category for personal preference controls.';
COMMENT ON TYPE core.email_routing_mode_enum IS 'Email dispatch policy on admin routing rules: OFF, ENABLED, or IMMEDIATE.';
COMMENT ON TYPE core.delivery_cadence_enum IS 'Personal administrator notification cadence: REAL_TIME or DAILY_DIGEST.';
COMMENT ON TYPE core.delivery_status_enum IS 'Asynchronous BullMQ dispatch status for notification deliveries.';

-- 6.3 Tables & Columns (24 Tables; mutable audit columns commented in trigger loop above)
COMMENT ON TABLE core.tenants IS 'Root multi-tenant accounts supporting Individual SMBs, Enterprises, and CA Firms.';
COMMENT ON COLUMN core.tenants.id IS 'Primary UUID identifier and root RLS tenant partition key.';
COMMENT ON COLUMN core.tenants.tenant_code IS 'Human-readable unique tenant identifier (e.g., TNT-0319).';
COMMENT ON COLUMN core.tenants.legal_name IS 'Registered legal entity or CA practice name.';
COMMENT ON COLUMN core.tenants.slug IS 'Unique lowercase subdomain workspace slug enforced for 409 Conflict validation.';
COMMENT ON COLUMN core.tenants.customer_type IS 'Customer archetype governing organization hierarchy and onboarding workflow.';
COMMENT ON COLUMN core.tenants.status IS 'Current lifecycle state of the tenant account.';
COMMENT ON COLUMN core.tenants.primary_region IS 'Primary cloud deployment region identifier (e.g., ap-south-1).';
COMMENT ON COLUMN core.tenants.default_currency IS 'Default ISO 4217 currency code for commercial displays (e.g., INR).';
COMMENT ON COLUMN core.tenants.fy_start_month IS 'Starting calendar month (1-12) of the tenant financial year (4 = Apr-Mar).';
COMMENT ON COLUMN core.tenants.default_timezone IS 'Default IANA timezone used for localized date/time formatting.';
COMMENT ON COLUMN core.tenants.trial_ends_on IS 'Calendar date when trial expires (DATE precision).';
COMMENT ON COLUMN core.tenants.suspended_at IS 'UTC timestamp with timezone when the tenant was suspended, if applicable.';
COMMENT ON COLUMN core.tenants.suspension_reason IS 'Mandatory administrative rationale recorded upon tenant suspension.';

COMMENT ON TABLE core.organizations IS 'Hierarchical legal entities, corporate subsidiaries, CA Practice HQs, and CA client orgs.';
COMMENT ON COLUMN core.organizations.id IS 'Primary UUID identifier for the organization entity.';
COMMENT ON COLUMN core.organizations.tenant_id IS 'Owning tenant UUID (mandatory RLS partition key).';
COMMENT ON COLUMN core.organizations.parent_org_id IS 'Self-referencing FK linking subsidiaries or CA client orgs to their parent HQ.';
COMMENT ON COLUMN core.organizations.org_code IS 'Human-readable unique organization code within the tenant (e.g., ORG-4412).';
COMMENT ON COLUMN core.organizations.legal_name IS 'Legal or operating name of the subsidiary or managed client organization.';
COMMENT ON COLUMN core.organizations.org_type IS 'Structural role of the organization inside the tenant hierarchy.';
COMMENT ON COLUMN core.organizations.tax_identifiers IS 'JSONB statutory identifiers (GSTIN, CIN, PAN, LLPIN).';
COMMENT ON COLUMN core.organizations.status IS 'Operational lifecycle status of the organization.';

COMMENT ON TABLE core.users IS 'Application-level user directory linked to delegated OIDC identities and UI preferences.';
COMMENT ON COLUMN core.users.id IS 'Primary UUID identifier for the platform user.';
COMMENT ON COLUMN core.users.primary_tenant_id IS 'Primary home tenant UUID (NULL for global Platform Super Admins).';
COMMENT ON COLUMN core.users.email IS 'Unique normalized lowercase work email address.';
COMMENT ON COLUMN core.users.full_name IS 'Full display name shown across directories and audit snapshots.';
COMMENT ON COLUMN core.users.phone IS 'Optional administrative contact phone number.';
COMMENT ON COLUMN core.users.is_platform_super_admin IS 'True when the user holds global cross-tenant Platform Super Admin privileges.';
COMMENT ON COLUMN core.users.mfa_enrolled IS 'Indicates IdP-reported MFA enrollment status driving security KPIs.';
COMMENT ON COLUMN core.users.status IS 'Current user lifecycle state.';
COMMENT ON COLUMN core.users.last_active_at IS 'UTC timestamp with timezone of the user last recorded portal activity.';
COMMENT ON COLUMN core.users.ui_nav_pinned IS 'Persisted user preference for floating (false) vs. pinned (true) left navigation.';
COMMENT ON COLUMN core.users.ui_theme_mode IS 'Persisted Light, Dark, or System UI appearance mode.';
COMMENT ON COLUMN core.users.last_workspace_tenant_id IS 'Remembered tenant UUID for direct post-login landing; NULL forces /workspaces selector for multi-tenant users.';

COMMENT ON TABLE core.user_oidc_identities IS 'Delegated OIDC/OAuth 2.0 subject links per identity provider.';
COMMENT ON COLUMN core.user_oidc_identities.id IS 'Primary UUID identifier for the OIDC identity link.';
COMMENT ON COLUMN core.user_oidc_identities.user_id IS 'Linked application user UUID.';
COMMENT ON COLUMN core.user_oidc_identities.tenant_id IS 'Tenant scope for enterprise SSO links (NULL for global managed OIDC).';
COMMENT ON COLUMN core.user_oidc_identities.provider_type IS 'Identity provider classification displayed in the Users directory.';
COMMENT ON COLUMN core.user_oidc_identities.issuer_url IS 'OIDC issuer discovery URL (iss claim).';
COMMENT ON COLUMN core.user_oidc_identities.oidc_subject IS 'Immutable external OIDC subject identifier (sub claim).';
COMMENT ON COLUMN core.user_oidc_identities.email_verified IS 'True when the identity provider has verified the user email address.';
COMMENT ON COLUMN core.user_oidc_identities.mfa_verified_at IS 'UTC timestamp with timezone of the most recent MFA verification.';
COMMENT ON COLUMN core.user_oidc_identities.sync_status IS 'Synchronization status with the external identity provider.';
COMMENT ON COLUMN core.user_oidc_identities.last_synced_at IS 'UTC timestamp with timezone of the last successful IdP sync.';

COMMENT ON TABLE core.user_invitations IS 'Pending and completed OIDC invitations reserving seat quota prior to acceptance.';
COMMENT ON COLUMN core.user_invitations.id IS 'Primary UUID identifier for the invitation record.';
COMMENT ON COLUMN core.user_invitations.tenant_id IS 'Target tenant UUID (mandatory RLS partition key).';
COMMENT ON COLUMN core.user_invitations.email IS 'Normalized lowercase email address of the invitee.';
COMMENT ON COLUMN core.user_invitations.invited_by_user_id IS 'Administrator user UUID who dispatched the invitation.';
COMMENT ON COLUMN core.user_invitations.token_hash IS 'SHA-256 hash of the single-use activation token.';
COMMENT ON COLUMN core.user_invitations.target_org_roles IS 'JSONB array of organizationId, roleId, and optional accessExpiresOn provisioned upon acceptance.';
COMMENT ON COLUMN core.user_invitations.welcome_message IS 'Optional custom welcome note displayed on the activation page.';
COMMENT ON COLUMN core.user_invitations.consumes_seat_quota IS 'True if this open invitation reserves a licensed seat under tenant quota.';
COMMENT ON COLUMN core.user_invitations.status IS 'Current invitation lifecycle state.';
COMMENT ON COLUMN core.user_invitations.expires_at IS 'UTC timestamp with timezone after which the invitation token expires.';
COMMENT ON COLUMN core.user_invitations.accepted_at IS 'UTC timestamp with timezone when the invitee completed OIDC activation.';
COMMENT ON COLUMN core.user_invitations.accepted_user_id IS 'User UUID materialized or linked upon invitation acceptance.';

COMMENT ON TABLE core.user_sessions IS 'Tracked OIDC portal sessions supporting idle-timeout enforcement and forced revocation.';
COMMENT ON COLUMN core.user_sessions.id IS 'Primary UUID identifier for the tracked portal session.';
COMMENT ON COLUMN core.user_sessions.user_id IS 'Authenticated user UUID owning this session.';
COMMENT ON COLUMN core.user_sessions.tenant_id IS 'Active tenant UUID bound to this session (NULL for unscoped global sessions).';
COMMENT ON COLUMN core.user_sessions.oidc_session_id IS 'Upstream OIDC session token/identifier (sid) used for session lookup and logout.';
COMMENT ON COLUMN core.user_sessions.ip_address IS 'Client IP address observed when the session was established.';
COMMENT ON COLUMN core.user_sessions.user_agent IS 'Client browser or device user-agent string.';
COMMENT ON COLUMN core.user_sessions.last_seen_at IS 'UTC timestamp with timezone of the most recent authenticated request.';
COMMENT ON COLUMN core.user_sessions.expires_at IS 'Hard UTC expiration timestamp with timezone for the session.';
COMMENT ON COLUMN core.user_sessions.revoked_at IS 'UTC timestamp with timezone when the session was explicitly revoked.';

COMMENT ON TABLE core.saas_modules IS 'Scalable registry of METRix microservices and commercially subscribable modules.';
COMMENT ON COLUMN core.saas_modules.code IS 'Stable machine key identifying the microservice module (e.g., tax_financial).';
COMMENT ON COLUMN core.saas_modules.display_name IS 'Customer-facing module title displayed in the Module Switcher and Subscriptions UI.';
COMMENT ON COLUMN core.saas_modules.description IS 'Concise functional summary of capabilities owned by the microservice.';
COMMENT ON COLUMN core.saas_modules.api_version IS 'Deployed OpenAPI contract version (e.g., v1.4).';
COMMENT ON COLUMN core.saas_modules.health_status IS 'Live operational health status powering the sidebar service indicator.';
COMMENT ON COLUMN core.saas_modules.included_features IS 'JSONB list of headline features rendered on commercial subscription cards.';
COMMENT ON COLUMN core.saas_modules.is_core_service IS 'True only for Platform Core; false for commercially subscribable business modules.';
COMMENT ON COLUMN core.saas_modules.is_active IS 'Controls whether the module is selectable for tenant subscriptions.';

COMMENT ON TABLE core.roles IS 'System-default (immutable, cloneable) and custom tenant/org-scoped RBAC roles.';
COMMENT ON COLUMN core.roles.id IS 'Primary UUID identifier for the RBAC role.';
COMMENT ON COLUMN core.roles.tenant_id IS 'Owning tenant UUID (NULL for immutable global System Default Roles).';
COMMENT ON COLUMN core.roles.name IS 'Role display name unique per tenant or global scope.';
COMMENT ON COLUMN core.roles.description IS 'Administrative description of the role privilege boundary.';
COMMENT ON COLUMN core.roles.scope IS 'Authorization scope level: PLATFORM, TENANT, or ORGANIZATION.';
COMMENT ON COLUMN core.roles.is_system_default IS 'True for immutable platform-seeded roles that tenants may clone but not edit.';
COMMENT ON COLUMN core.roles.cloned_from_role_id IS 'Source role UUID when this custom role was created via Clone Role.';
COMMENT ON COLUMN core.roles.is_active IS 'Soft activation flag allowing retirement without breaking historical references.';

COMMENT ON TABLE core.permissions IS 'Canonical catalog of granular permissions across all registered microservices.';
COMMENT ON COLUMN core.permissions.id IS 'Primary UUID identifier for the permission atom.';
COMMENT ON COLUMN core.permissions.module_code IS 'Owning microservice module code grouping accordion sections in the RBAC matrix.';
COMMENT ON COLUMN core.permissions.resource_key IS 'Machine resource identifier (e.g., tax.scenarios).';
COMMENT ON COLUMN core.permissions.resource_label IS 'Human-readable resource row title in the Permission Matrix UI.';
COMMENT ON COLUMN core.permissions.action IS 'Granular action column (VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT, MANAGE).';
COMMENT ON COLUMN core.permissions.permission_code IS 'Canonical scope string enforced by guards (e.g., subscriptions:manage).';
COMMENT ON COLUMN core.permissions.description IS 'Concise tooltip description of the permission capability.';
COMMENT ON COLUMN core.permissions.is_high_privilege IS 'Flags sensitive administrative scopes that trigger escalation warnings and alerts.';

COMMENT ON TABLE core.role_permissions IS 'Many-to-many join mapping permissions to each RBAC role.';
COMMENT ON COLUMN core.role_permissions.role_id IS 'Target RBAC role UUID.';
COMMENT ON COLUMN core.role_permissions.permission_id IS 'Granted permission atom UUID.';
COMMENT ON COLUMN core.role_permissions.tenant_id IS 'Denormalized tenant UUID (NULL for system default roles) supporting direct RLS checks.';

COMMENT ON TABLE core.organization_memberships IS 'Scoped per-org role assignments enforcing strict CA Firm multi-client RLS isolation.';
COMMENT ON COLUMN core.organization_memberships.id IS 'Primary UUID identifier for the membership record.';
COMMENT ON COLUMN core.organization_memberships.tenant_id IS 'Owning tenant UUID (primary RLS partition key).';
COMMENT ON COLUMN core.organization_memberships.organization_id IS 'Specific subsidiary or CA client organization UUID granted by this membership.';
COMMENT ON COLUMN core.organization_memberships.user_id IS 'Assigned platform user UUID.';
COMMENT ON COLUMN core.organization_memberships.role_id IS 'RBAC role UUID granted to the user strictly within this organization.';
COMMENT ON COLUMN core.organization_memberships.membership_type IS 'Distinguishes internal staff, tenant admins, CA practice staff, and external client users.';
COMMENT ON COLUMN core.organization_memberships.status IS 'Current activation state of this organization membership.';
COMMENT ON COLUMN core.organization_memberships.access_starts_on IS 'Optional calendar date when membership access begins (DATE precision).';
COMMENT ON COLUMN core.organization_memberships.access_expires_on IS 'Optional calendar date for time-bound access expiry; NULL denotes permanent access.';
COMMENT ON COLUMN core.organization_memberships.consumes_seat_quota IS 'True when this membership counts toward the tenant licensed seat limit.';

COMMENT ON TABLE core.subscription_plans IS 'Commercial plan tiers with Decimal.js-safe NUMERIC(14,2) pricing.';
COMMENT ON COLUMN core.subscription_plans.id IS 'Primary UUID identifier for the commercial plan tier.';
COMMENT ON COLUMN core.subscription_plans.code IS 'Unique plan machine code (e.g., CA_PRACTICE_PRO).';
COMMENT ON COLUMN core.subscription_plans.name IS 'Customer-facing plan display name.';
COMMENT ON COLUMN core.subscription_plans.target_customer_type IS 'Intended customer archetype for plan eligibility.';
COMMENT ON COLUMN core.subscription_plans.default_seat_limit IS 'Default licensed user seat cap included in this plan tier.';
COMMENT ON COLUMN core.subscription_plans.default_org_limit IS 'Default maximum organizations or CA client orgs included in this tier.';
COMMENT ON COLUMN core.subscription_plans.annual_base_price IS 'Exact annual base price stored as NUMERIC(14,2) for Decimal.js precision.';
COMMENT ON COLUMN core.subscription_plans.monthly_base_price IS 'Exact monthly base price stored as NUMERIC(14,2) for Decimal.js precision.';
COMMENT ON COLUMN core.subscription_plans.currency_code IS 'ISO 4217 currency code (e.g., INR).';
COMMENT ON COLUMN core.subscription_plans.is_active IS 'Indicates whether the plan is available for new sign-ups and upgrades.';

COMMENT ON TABLE core.tenant_subscriptions IS 'Active commercial contract and enforced seat/org limits per tenant.';
COMMENT ON COLUMN core.tenant_subscriptions.id IS 'Primary UUID identifier for the tenant subscription contract.';
COMMENT ON COLUMN core.tenant_subscriptions.tenant_id IS 'Subscribing tenant UUID (one active contract per tenant; RLS key).';
COMMENT ON COLUMN core.tenant_subscriptions.plan_id IS 'Active commercial plan tier UUID.';
COMMENT ON COLUMN core.tenant_subscriptions.billing_cycle IS 'Contracted billing cadence: MONTHLY or ANNUAL.';
COMMENT ON COLUMN core.tenant_subscriptions.status IS 'Commercial lifecycle status of the subscription.';
COMMENT ON COLUMN core.tenant_subscriptions.contract_value IS 'Exact contracted recurring value stored as NUMERIC(14,2) for Decimal.js safety.';
COMMENT ON COLUMN core.tenant_subscriptions.currency_code IS 'ISO 4217 currency code.';
COMMENT ON COLUMN core.tenant_subscriptions.seat_limit IS 'Enforced maximum active plus pending licensed user seats.';
COMMENT ON COLUMN core.tenant_subscriptions.org_limit IS 'Enforced maximum active organizations or CA client orgs.';
COMMENT ON COLUMN core.tenant_subscriptions.current_period_start_on IS 'Start calendar date of the active billing period.';
COMMENT ON COLUMN core.tenant_subscriptions.current_period_end_on IS 'End calendar date of the active billing period.';
COMMENT ON COLUMN core.tenant_subscriptions.renewal_date IS 'Next scheduled contract renewal calendar date.';
COMMENT ON COLUMN core.tenant_subscriptions.trial_ends_on IS 'Trial expiration calendar date when subscription status is TRIAL.';

COMMENT ON TABLE core.tenant_module_subscriptions IS 'Tenant-level microservice module subscriptions and feature flags.';
COMMENT ON COLUMN core.tenant_module_subscriptions.id IS 'Primary UUID identifier for the tenant-module subscription.';
COMMENT ON COLUMN core.tenant_module_subscriptions.tenant_id IS 'Subscribing tenant UUID (mandatory RLS key).';
COMMENT ON COLUMN core.tenant_module_subscriptions.subscription_id IS 'Parent tenant subscription contract UUID.';
COMMENT ON COLUMN core.tenant_module_subscriptions.module_code IS 'Subscribed downstream microservice module code.';
COMMENT ON COLUMN core.tenant_module_subscriptions.status IS 'Commercial module entitlement status shown on Module Cards.';
COMMENT ON COLUMN core.tenant_module_subscriptions.module_seat_limit IS 'Optional module-specific licensed seat cap within the tenant total seat limit.';
COMMENT ON COLUMN core.tenant_module_subscriptions.feature_flags IS 'JSONB map of tenant-level feature flags enabled for this module.';
COMMENT ON COLUMN core.tenant_module_subscriptions.activated_at IS 'UTC timestamp with timezone when this module was activated.';
COMMENT ON COLUMN core.tenant_module_subscriptions.deactivated_at IS 'UTC timestamp with timezone when this module was disabled or downgraded.';

COMMENT ON TABLE core.organization_module_entitlements IS 'Organization-level module entitlement switches and seat allocations.';
COMMENT ON COLUMN core.organization_module_entitlements.id IS 'Primary UUID identifier for the organization module entitlement.';
COMMENT ON COLUMN core.organization_module_entitlements.tenant_id IS 'Owning tenant UUID (mandatory RLS key).';
COMMENT ON COLUMN core.organization_module_entitlements.organization_id IS 'Target subsidiary or CA client organization UUID.';
COMMENT ON COLUMN core.organization_module_entitlements.module_code IS 'Target downstream microservice module code.';
COMMENT ON COLUMN core.organization_module_entitlements.is_enabled IS 'Explicit toggle enabling or disabling the subscribed module for this organization.';
COMMENT ON COLUMN core.organization_module_entitlements.allocated_seat_limit IS 'Optional seat quota allocated specifically to this organization.';
COMMENT ON COLUMN core.organization_module_entitlements.feature_overrides IS 'JSONB organization-level feature flag overrides within tenant entitlements.';

COMMENT ON TABLE core.subscription_change_logs IS 'Auditable history of upgrades, downgrades, Decimal.js proration, and typed confirmations.';
COMMENT ON COLUMN core.subscription_change_logs.id IS 'Primary UUID identifier for the subscription change transaction.';
COMMENT ON COLUMN core.subscription_change_logs.tenant_id IS 'Affected tenant UUID (mandatory RLS key).';
COMMENT ON COLUMN core.subscription_change_logs.subscription_id IS 'Target tenant subscription UUID.';
COMMENT ON COLUMN core.subscription_change_logs.change_type IS 'Classification of the commercial change (upgrade, downgrade, module/quota update).';
COMMENT ON COLUMN core.subscription_change_logs.effective_timing IS 'Whether the change applies immediately or at end of billing cycle.';
COMMENT ON COLUMN core.subscription_change_logs.effective_on IS 'Calendar date on which the change takes commercial effect.';
COMMENT ON COLUMN core.subscription_change_logs.previous_plan_id IS 'Plan UUID prior to this change.';
COMMENT ON COLUMN core.subscription_change_logs.new_plan_id IS 'Target plan UUID after this change.';
COMMENT ON COLUMN core.subscription_change_logs.proration_amount IS 'Exact Decimal.js prorated charge (+) or credit (-) as NUMERIC(14,2).';
COMMENT ON COLUMN core.subscription_change_logs.currency_code IS 'ISO 4217 currency code.';
COMMENT ON COLUMN core.subscription_change_logs.impact_summary IS 'JSONB hard blockers, soft warnings, and affected user/org counts evaluated before confirmation.';
COMMENT ON COLUMN core.subscription_change_logs.confirmation_token_typed IS 'Typed confirmation keyword captured in destructive downgrade safeguard dialogs.';
COMMENT ON COLUMN core.subscription_change_logs.confirmed_by_user_id IS 'Administrator user UUID who confirmed the subscription change.';
COMMENT ON COLUMN core.subscription_change_logs.confirmed_at IS 'UTC timestamp with timezone when the change was confirmed.';
COMMENT ON COLUMN core.subscription_change_logs.status IS 'Current workflow state of the subscription change record.';

COMMENT ON TABLE core.platform_configurations IS 'Versioned global and tenant-scoped policies (OIDC, MFA, retention, feature flags).';
COMMENT ON COLUMN core.platform_configurations.id IS 'Primary UUID identifier for the configuration record.';
COMMENT ON COLUMN core.platform_configurations.scope_tenant_id IS 'NULL for global platform defaults; tenant UUID for tenant-specific overrides.';
COMMENT ON COLUMN core.platform_configurations.category IS 'Configuration tab grouping (localization, OIDC/SSO, quotas, feature flags).';
COMMENT ON COLUMN core.platform_configurations.config_key IS 'Stable dot-delimited configuration key name.';
COMMENT ON COLUMN core.platform_configurations.config_value IS 'Structured JSONB configuration payload.';
COMMENT ON COLUMN core.platform_configurations.is_sensitive IS 'True when values must be masked in UI responses and redacted in audit diffs.';
COMMENT ON COLUMN core.platform_configurations.requires_impact_confirmation IS 'True when saving edits requires an explicit security impact confirmation dialog.';
COMMENT ON COLUMN core.platform_configurations.version IS 'Monotonic optimistic-locking version incremented on every update.';

COMMENT ON TABLE core.api_keys IS 'Hashed machine-to-machine integration keys with masked prefixes.';
COMMENT ON COLUMN core.api_keys.id IS 'Primary UUID identifier for the API key record.';
COMMENT ON COLUMN core.api_keys.tenant_id IS 'Owning tenant UUID (NULL for global platform integration keys).';
COMMENT ON COLUMN core.api_keys.name IS 'Human-readable label identifying the integration consumer.';
COMMENT ON COLUMN core.api_keys.key_prefix IS 'Non-sensitive visible prefix displayed in listings (e.g., mtrx_live_9f2a).';
COMMENT ON COLUMN core.api_keys.key_hash IS 'One-way cryptographic hash of the full API key secret.';
COMMENT ON COLUMN core.api_keys.scopes IS 'JSONB array of RBAC permission codes granted to this API key.';
COMMENT ON COLUMN core.api_keys.status IS 'Key lifecycle status: ACTIVE, ROTATED, or REVOKED.';
COMMENT ON COLUMN core.api_keys.last_used_at IS 'UTC timestamp with timezone of the most recent authenticated API call.';
COMMENT ON COLUMN core.api_keys.expires_at IS 'Optional hard UTC expiration timestamp with timezone.';
COMMENT ON COLUMN core.api_keys.revoked_at IS 'UTC timestamp with timezone when the key was revoked or rotated out.';

COMMENT ON TABLE core.webhook_endpoints IS 'Outbound HTTPS webhook endpoints with encrypted HMAC signing secrets.';
COMMENT ON COLUMN core.webhook_endpoints.id IS 'Primary UUID identifier for the webhook endpoint.';
COMMENT ON COLUMN core.webhook_endpoints.tenant_id IS 'Owning tenant UUID (NULL for global platform webhooks).';
COMMENT ON COLUMN core.webhook_endpoints.url IS 'Target HTTPS callback URL receiving signed event payloads.';
COMMENT ON COLUMN core.webhook_endpoints.signing_secret_encrypted IS 'KMS-encrypted HMAC signing secret used to sign outbound payloads.';
COMMENT ON COLUMN core.webhook_endpoints.subscribed_events IS 'JSONB list of event keys routed to this endpoint.';
COMMENT ON COLUMN core.webhook_endpoints.status IS 'Operational delivery status: ACTIVE, PAUSED, or FAILING.';
COMMENT ON COLUMN core.webhook_endpoints.last_delivery_http_code IS 'HTTP response status code recorded on the latest delivery attempt.';
COMMENT ON COLUMN core.webhook_endpoints.last_delivered_at IS 'UTC timestamp with timezone of the most recent delivery attempt.';

COMMENT ON TABLE core.audit_logs IS 'Append-only immutable audit stream with OpenTelemetry trace correlation and JSON diffs.';
COMMENT ON COLUMN core.audit_logs.id IS 'Primary UUID identifier for the immutable audit event.';
COMMENT ON COLUMN core.audit_logs.event_code IS 'Human-readable unique audit reference code (e.g., EVT-98412).';
COMMENT ON COLUMN core.audit_logs.tenant_id IS 'Tenant UUID associated with the event (NULL for global platform events).';
COMMENT ON COLUMN core.audit_logs.organization_id IS 'Organization or CA client UUID targeted by the event (org-level RLS key).';
COMMENT ON COLUMN core.audit_logs.actor_user_id IS 'Application user UUID of the actor who initiated the operation.';
COMMENT ON COLUMN core.audit_logs.actor_oidc_sub IS 'Delegated OIDC subject claim captured at execution time.';
COMMENT ON COLUMN core.audit_logs.actor_name_snapshot IS 'Point-in-time actor display name preserved for historical compliance.';
COMMENT ON COLUMN core.audit_logs.actor_role_snapshot IS 'Point-in-time actor role name preserved for audit inspection.';
COMMENT ON COLUMN core.audit_logs.service_source IS 'Originating microservice code that emitted this audit event.';
COMMENT ON COLUMN core.audit_logs.action_category IS 'Faceted compliance category (AUTH, RBAC, SUBSCRIPTION, CONFIG, TENANCY, MODULE_DOMAIN).';
COMMENT ON COLUMN core.audit_logs.event_action IS 'Canonical dot-delimited action identifier (e.g., role.permissions.updated).';
COMMENT ON COLUMN core.audit_logs.target_resource_type IS 'Entity type targeted by the audited operation.';
COMMENT ON COLUMN core.audit_logs.target_resource_id IS 'Identifier of the targeted resource.';
COMMENT ON COLUMN core.audit_logs.outcome IS 'Execution outcome: SUCCESS, DENIED, or FAILED.';
COMMENT ON COLUMN core.audit_logs.http_status_code IS 'HTTP status code returned by the API endpoint (e.g., 200, 403, 409).';
COMMENT ON COLUMN core.audit_logs.otel_trace_id IS 'OpenTelemetry distributed trace ID correlating cross-service operations.';
COMMENT ON COLUMN core.audit_logs.ip_address IS 'Client IP address recorded at the API Gateway.';
COMMENT ON COLUMN core.audit_logs.user_agent IS 'Client User-Agent header snapshot.';
COMMENT ON COLUMN core.audit_logs.before_state IS 'Structured JSONB state snapshot captured prior to mutation.';
COMMENT ON COLUMN core.audit_logs.after_state IS 'Structured JSONB state snapshot captured after mutation.';
COMMENT ON COLUMN core.audit_logs.retention_until_on IS 'Statutory calendar date until which this immutable audit record must be retained.';
COMMENT ON COLUMN core.audit_logs.created_by IS 'UUID of the user or system actor that emitted this immutable audit event.';
COMMENT ON COLUMN core.audit_logs.created_at IS 'Immutable UTC timestamp with timezone when the audited event occurred.';

COMMENT ON TABLE core.notification_channel_configs IS 'Provider status for In-App, Email (SES), and Webhook channels.';
COMMENT ON COLUMN core.notification_channel_configs.id IS 'Primary UUID identifier for the notification channel configuration.';
COMMENT ON COLUMN core.notification_channel_configs.tenant_id IS 'NULL for global platform providers; tenant UUID for tenant-specific overrides.';
COMMENT ON COLUMN core.notification_channel_configs.channel IS 'Transport channel type: IN_APP, EMAIL_SES, or WEBHOOK.';
COMMENT ON COLUMN core.notification_channel_configs.provider_name IS 'Display name of the configured transport provider.';
COMMENT ON COLUMN core.notification_channel_configs.status IS 'Current operational health of the notification channel.';
COMMENT ON COLUMN core.notification_channel_configs.config_json IS 'Non-secret JSONB transport settings (sender address, retry policy).';

COMMENT ON TABLE core.notification_routing_rules IS 'Admin event-to-channel routing matrix and role recipient mapping.';
COMMENT ON COLUMN core.notification_routing_rules.id IS 'Primary UUID identifier for the notification routing rule.';
COMMENT ON COLUMN core.notification_routing_rules.tenant_id IS 'NULL for platform default rules; tenant UUID for tenant-specific overrides.';
COMMENT ON COLUMN core.notification_routing_rules.event_key IS 'Canonical event trigger key (e.g., quota.seat_90pct).';
COMMENT ON COLUMN core.notification_routing_rules.event_label IS 'Human-readable event title displayed in the Admin Routing Matrix.';
COMMENT ON COLUMN core.notification_routing_rules.event_category IS 'Notification category grouping for personal preference inheritance.';
COMMENT ON COLUMN core.notification_routing_rules.in_app_enabled IS 'Enables real-time In-App notification bell alerts for this event.';
COMMENT ON COLUMN core.notification_routing_rules.email_mode IS 'Email dispatch policy: OFF, ENABLED, or IMMEDIATE (bypasses quiet hours).';
COMMENT ON COLUMN core.notification_routing_rules.webhook_enabled IS 'Enables outbound webhook dispatch via BullMQ for this event.';
COMMENT ON COLUMN core.notification_routing_rules.recipient_role_names IS 'JSONB array of role names targeted by this routing rule.';
COMMENT ON COLUMN core.notification_routing_rules.template_subject IS 'Notification subject template supporting interpolation tokens.';
COMMENT ON COLUMN core.notification_routing_rules.template_body IS 'Notification body template rendered for email and in-app alerts.';

COMMENT ON TABLE core.user_notification_preferences IS 'Personal administrator delivery cadence, daily digest, and quiet hours.';
COMMENT ON COLUMN core.user_notification_preferences.id IS 'Primary UUID identifier for the user preference row.';
COMMENT ON COLUMN core.user_notification_preferences.user_id IS 'Administrator user UUID owning this preference.';
COMMENT ON COLUMN core.user_notification_preferences.tenant_id IS 'Optional tenant UUID scope for multi-tenant administrators.';
COMMENT ON COLUMN core.user_notification_preferences.event_category IS 'Notification category controlled by this preference row.';
COMMENT ON COLUMN core.user_notification_preferences.in_app_enabled IS 'Personal toggle for In-App notification bell alerts.';
COMMENT ON COLUMN core.user_notification_preferences.email_enabled IS 'Personal toggle for transactional email alerts.';
COMMENT ON COLUMN core.user_notification_preferences.delivery_cadence IS 'Personal dispatch cadence: REAL_TIME or DAILY_DIGEST.';
COMMENT ON COLUMN core.user_notification_preferences.digest_time_local IS 'Local wall-clock time (TIME) for daily digest dispatch.';
COMMENT ON COLUMN core.user_notification_preferences.digest_timezone IS 'IANA timezone used to interpret digest and quiet-hours windows.';
COMMENT ON COLUMN core.user_notification_preferences.mute_non_critical IS 'Suppresses non-critical alerts during the configured quiet window.';
COMMENT ON COLUMN core.user_notification_preferences.mute_start_local IS 'Quiet-hours start local wall-clock time.';
COMMENT ON COLUMN core.user_notification_preferences.mute_end_local IS 'Quiet-hours end local wall-clock time.';

COMMENT ON TABLE core.notification_deliveries IS 'Notification inbox and BullMQ delivery log supporting unread counts and retries.';
COMMENT ON COLUMN core.notification_deliveries.id IS 'Primary UUID identifier for the notification delivery record.';
COMMENT ON COLUMN core.notification_deliveries.tenant_id IS 'Associated tenant UUID (NULL for global platform alerts).';
COMMENT ON COLUMN core.notification_deliveries.recipient_user_id IS 'Target recipient user UUID powering the top-bar unread bell count.';
COMMENT ON COLUMN core.notification_deliveries.event_key IS 'Triggering event key that generated this notification.';
COMMENT ON COLUMN core.notification_deliveries.channel IS 'Transport channel used for delivery.';
COMMENT ON COLUMN core.notification_deliveries.subject IS 'Rendered alert subject displayed in the Notification Center and logs.';
COMMENT ON COLUMN core.notification_deliveries.payload IS 'Structured JSONB alert metadata and contextual deep-link URL.';
COMMENT ON COLUMN core.notification_deliveries.delivery_status IS 'Asynchronous BullMQ delivery state (QUEUED, DELIVERED, BOUNCED, RETRYING, FAILED).';
COMMENT ON COLUMN core.notification_deliveries.bullmq_job_id IS 'Correlated BullMQ job identifier supporting 1-click delivery retries.';
COMMENT ON COLUMN core.notification_deliveries.attempt_count IS 'Total delivery attempts executed by the BullMQ worker.';
COMMENT ON COLUMN core.notification_deliveries.last_error IS 'Most recent transport error message if bounced or failed.';
COMMENT ON COLUMN core.notification_deliveries.is_read IS 'True once the recipient has marked the In-App alert as read.';
COMMENT ON COLUMN core.notification_deliveries.read_at IS 'UTC timestamp with timezone when the recipient read the alert.';
COMMENT ON COLUMN core.notification_deliveries.sent_at IS 'UTC timestamp with timezone when the provider confirmed dispatch.';

-- 6.4 Views & View Columns
COMMENT ON VIEW core.v_tenant_quota_utilization IS 'Real-time seat and org utilization metrics driving Near-Cap badges and Quota Guards.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.tenant_id IS 'Tenant UUID.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.tenant_code IS 'Human-readable tenant code.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.legal_name IS 'Tenant registered legal name.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.customer_type IS 'Tenant customer archetype.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.tenant_status IS 'Current tenant lifecycle status.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.seat_limit IS 'Contracted licensed user seat cap.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.org_limit IS 'Contracted maximum organization/client cap.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.active_seats_used IS 'Distinct active, unexpired users consuming licensed seats.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.pending_invite_seats IS 'Open unexpired invitations currently reserving seats.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.active_orgs_used IS 'Total active organizations provisioned under the tenant.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.seat_utilization_pct IS 'Percentage of licensed seats currently consumed.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.org_utilization_pct IS 'Percentage of licensed organization cap currently consumed.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.is_seat_near_cap IS 'True when seat utilization reaches or exceeds 90%.';
COMMENT ON COLUMN core.v_tenant_quota_utilization.is_org_near_cap IS 'True when organization utilization reaches or exceeds 90%.';

COMMENT ON VIEW core.v_effective_user_org_permissions IS 'Computed intersection of active org memberships, RBAC roles, and org module entitlements.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.tenant_id IS 'Tenant UUID boundary.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.organization_id IS 'Organization UUID boundary.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.user_id IS 'Authenticated user UUID.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.role_id IS 'Assigned RBAC role UUID.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.role_name IS 'Assigned RBAC role display name.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.module_code IS 'Owning microservice module code.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.permission_code IS 'Canonical granted permission code.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.resource_key IS 'Target resource key within the module.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.action IS 'Granular action granted on the resource.';
COMMENT ON COLUMN core.v_effective_user_org_permissions.is_entitlement_active IS 'True when the permission is effective under both tenant subscription and org entitlement.';

-- 6.5 Functions & Triggers
COMMENT ON FUNCTION core.ctx_is_super_admin() IS 'Reads transaction-local app.is_platform_super_admin RLS flag safely.';
COMMENT ON FUNCTION core.ctx_tenant_id() IS 'Reads transaction-local app.current_tenant_id UUID for tenant RLS isolation.';
COMMENT ON FUNCTION core.ctx_user_id() IS 'Reads transaction-local app.current_user_id UUID for user and membership RLS checks.';
COMMENT ON FUNCTION core.ctx_is_tenant_owner() IS 'Reads transaction-local app.is_tenant_owner flag for tenant-wide owner access.';
COMMENT ON FUNCTION core.ctx_has_org_access(UUID, UUID) IS 'SECURITY DEFINER helper verifying active, unexpired organization membership without RLS recursion.';
COMMENT ON FUNCTION core.ctx_can_access_user(UUID, UUID) IS 'SECURITY DEFINER helper enforcing tenant-scoped user directory visibility without RLS recursion.';
COMMENT ON FUNCTION core.prevent_audit_log_mutation() IS 'Trigger function blocking all UPDATE, DELETE, and TRUNCATE mutations on core.audit_logs.';
COMMENT ON FUNCTION core.touch_updated_at() IS 'Trigger function setting NEW.updated_at := NOW() on mutable table updates.';
COMMENT ON TRIGGER trg_audit_logs_immutable ON core.audit_logs IS 'Statement-level immutability guard enforcing append-only compliance on core.audit_logs.';

-- 6.6 Row-Level Security Policies (25 Policies across 21 FORCE RLS Tables)
COMMENT ON POLICY rls_tenants_isolation ON core.tenants IS 'Restricts tenant visibility and writes to Platform Super Admins or the active tenant context.';
COMMENT ON POLICY rls_organizations_org_isolation ON core.organizations IS 'Enforces CA Firm multi-client and subsidiary organization isolation via core.ctx_has_org_access().';
COMMENT ON POLICY rls_users_isolation ON core.users IS 'Restricts user directory visibility to self, same-tenant members, or Platform Super Admins.';
COMMENT ON POLICY rls_user_oidc_isolation ON core.user_oidc_identities IS 'Restricts OIDC identity links to the owning user, tenant context, or Platform Super Admins.';
COMMENT ON POLICY rls_invitations_isolation ON core.user_invitations IS 'Isolates user invitations strictly to the owning tenant or Platform Super Admins.';
COMMENT ON POLICY rls_sessions_isolation ON core.user_sessions IS 'Restricts session inspection and revocation to the session owner, tenant owner, or Super Admin.';
COMMENT ON POLICY rls_roles_select ON core.roles IS 'Allows reading global System Default Roles plus custom roles belonging to the active tenant.';
COMMENT ON POLICY rls_roles_write ON core.roles IS 'Restricts role mutations to custom roles within the active tenant or Platform Super Admins.';
COMMENT ON POLICY rls_role_permissions_select ON core.role_permissions IS 'Allows reading permission mappings for system defaults and active tenant custom roles.';
COMMENT ON POLICY rls_role_permissions_write ON core.role_permissions IS 'Restricts permission matrix mutations to custom roles within the active tenant or Super Admins.';
COMMENT ON POLICY rls_org_memberships_isolation ON core.organization_memberships IS 'Restricts membership visibility to self, authorized organization scope, or Platform Super Admins.';
COMMENT ON POLICY rls_tenant_subs_isolation ON core.tenant_subscriptions IS 'Isolates commercial subscription contracts strictly to the owning tenant or Super Admins.';
COMMENT ON POLICY rls_tenant_mod_subs_isolation ON core.tenant_module_subscriptions IS 'Isolates tenant-level module subscriptions strictly to the owning tenant or Super Admins.';
COMMENT ON POLICY rls_org_entitlements_isolation ON core.organization_module_entitlements IS 'Enforces organization-scoped visibility and tenant-owner writes on module entitlements.';
COMMENT ON POLICY rls_sub_change_logs_isolation ON core.subscription_change_logs IS 'Isolates subscription upgrade/downgrade change logs strictly to the owning tenant or Super Admins.';
COMMENT ON POLICY rls_platform_config_select ON core.platform_configurations IS 'Allows reading global platform defaults and active tenant configuration overrides.';
COMMENT ON POLICY rls_platform_config_write ON core.platform_configurations IS 'Restricts configuration writes to the active tenant scope or Platform Super Admins.';
COMMENT ON POLICY rls_api_keys_isolation ON core.api_keys IS 'Isolates scoped M2M API keys strictly to the owning tenant or Platform Super Admins.';
COMMENT ON POLICY rls_webhooks_isolation ON core.webhook_endpoints IS 'Isolates outbound webhook endpoints strictly to the owning tenant or Platform Super Admins.';
COMMENT ON POLICY rls_audit_logs_select ON core.audit_logs IS 'Enforces tenant and organization-scoped read isolation over immutable audit logs.';
COMMENT ON POLICY rls_audit_logs_insert ON core.audit_logs IS 'Permits append-only audit log inserts scoped to the active tenant or Platform Super Admins.';
COMMENT ON POLICY rls_notif_channels_isolation ON core.notification_channel_configs IS 'Allows reading global notification providers and managing tenant-scoped overrides.';
COMMENT ON POLICY rls_notif_rules_isolation ON core.notification_routing_rules IS 'Allows reading default notification rules and managing tenant-scoped routing overrides.';
COMMENT ON POLICY rls_user_notif_prefs_isolation ON core.user_notification_preferences IS 'Restricts personal notification preferences strictly to the owning user or Super Admins.';
COMMENT ON POLICY rls_notif_deliveries_isolation ON core.notification_deliveries IS 'Restricts notification inbox and dispatch logs to the recipient, tenant owner, or Super Admins.';

COMMIT;
