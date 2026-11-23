-- drizzle/migrations/0001_platform_core_rls_and_views.sql
--
-- Purpose: Enables FORCE Row-Level Security, immutable audit triggers, updated_at triggers, operational views, and catalog comments.
--
-- Context: Guarantees database-enforced multi-tenant, CA Firm multi-client organization, and user isolation plus tamper-proof audit logs.
--
-- Implementation Specs: PostgreSQL 16 transaction applying 21 FORCE RLS policies, SECURITY DEFINER helper functions, statement-level audit trigger, and 2 security_invoker views.

-- ============================================================================
-- Advantax Tax METRix — Platform Core Service
-- Migration 0001: Runtime Role Grants, 21 FORCE RLS Policies (Tenant, CA Org &
--                 User Isolation), Audit Immutability, Operational Views &
--                 PostgreSQL Catalog Comments
-- ============================================================================

BEGIN;

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

-- 21 FORCE ROW LEVEL SECURITY Policies
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
  WITH CHECK (core.ctx_is_super_admin() OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner()));

ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_users_isolation ON core.users;
CREATE POLICY rls_users_isolation ON core.users
  USING (core.ctx_can_access_user(id, primary_tenant_id))
  WITH CHECK (core.ctx_is_super_admin() OR id = core.ctx_user_id() OR (core.ctx_is_tenant_owner() AND primary_tenant_id = core.ctx_tenant_id()));

ALTER TABLE core.user_oidc_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_oidc_identities FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_user_oidc_isolation ON core.user_oidc_identities;
CREATE POLICY rls_user_oidc_isolation ON core.user_oidc_identities
  USING (core.ctx_is_super_admin() OR user_id = core.ctx_user_id() OR tenant_id = core.ctx_tenant_id())
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
  USING (core.ctx_is_super_admin() OR user_id = core.ctx_user_id() OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id()))
  WITH CHECK (core.ctx_is_super_admin() OR user_id = core.ctx_user_id() OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id()));

ALTER TABLE core.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_roles_select ON core.roles;
CREATE POLICY rls_roles_select ON core.roles FOR SELECT
  USING (core.ctx_is_super_admin() OR is_system_default = true OR tenant_id = core.ctx_tenant_id());
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
  USING (core.ctx_is_super_admin() OR (tenant_id = core.ctx_tenant_id() AND (user_id = core.ctx_user_id() OR core.ctx_has_org_access(tenant_id, organization_id))))
  WITH CHECK (core.ctx_is_super_admin() OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner()));

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
  WITH CHECK (core.ctx_is_super_admin() OR (tenant_id = core.ctx_tenant_id() AND core.ctx_is_tenant_owner()));

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
  USING (core.ctx_is_super_admin() OR (tenant_id = core.ctx_tenant_id() AND (core.ctx_is_tenant_owner() OR organization_id IS NULL OR core.ctx_has_org_access(tenant_id, organization_id))));
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
  USING (core.ctx_is_super_admin() OR recipient_user_id = core.ctx_user_id() OR (core.ctx_is_tenant_owner() AND tenant_id = core.ctx_tenant_id()))
  WITH CHECK (core.ctx_is_super_admin() OR tenant_id = core.ctx_tenant_id());

-- Immutable Append-Only Audit Trigger (FOR EACH STATEMENT fires before RLS row filters)
CREATE OR REPLACE FUNCTION core.prevent_audit_log_mutation() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'core.audit_logs is strictly append-only; UPDATE, DELETE and TRUNCATE are prohibited.';
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
DECLARE tbl TEXT;
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
  END LOOP;
END $$;

-- Security-Invoker Views honoring caller RLS
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
  ROUND((COUNT(DISTINCT CASE WHEN om.status = 'ACTIVE' AND om.consumes_seat_quota = true THEN om.user_id END)::numeric / NULLIF(ts.seat_limit, 0)) * 100, 2) AS seat_utilization_pct,
  ROUND((COUNT(DISTINCT CASE WHEN o.status = 'ACTIVE' THEN o.id END)::numeric / NULLIF(ts.org_limit, 0)) * 100, 2) AS org_utilization_pct,
  (COUNT(DISTINCT CASE WHEN om.status = 'ACTIVE' AND om.consumes_seat_quota = true THEN om.user_id END)::numeric / NULLIF(ts.seat_limit, 0) >= 0.90) AS is_seat_near_cap,
  (COUNT(DISTINCT CASE WHEN o.status = 'ACTIVE' THEN o.id END)::numeric / NULLIF(ts.org_limit, 0) >= 0.90) AS is_org_near_cap
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

COMMENT ON SCHEMA core IS 'Advantax Tax METRix Platform Core schema owning tenancy, OIDC links, RBAC, subscriptions, entitlements, config, audit logs, and notifications.';
COMMENT ON VIEW core.v_tenant_quota_utilization IS 'Real-time seat and org utilization metrics driving Near-Cap badges and Quota Guards.';
COMMENT ON VIEW core.v_effective_user_org_permissions IS 'Computed intersection of active org memberships, RBAC roles, and org module entitlements.';

COMMIT;
