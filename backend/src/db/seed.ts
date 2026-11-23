// src/db/seed.ts
//
// Purpose: Populates realistic SMB, Enterprise, and CA Firm reference data and validates live PostgreSQL RLS and audit immutability.
//
// Context: Executes under metrix_app (NOBYPASSRLS) with Decimal.js-safe pricing to prove CA multi-client isolation, cross-tenant isolation, and append-only audit logs.
//
// Implementation Specs: Idempotent Drizzle seed exporting SEED_IDS, runSeed(), and seedPlatformCore alias plus standalone CLI runner.

import 'dotenv/config';
import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';
import { eq } from 'drizzle-orm';
import { createDbPool, withRlsContext } from './index';
import * as s from './schema';

export const SEED_IDS = {
  superAdmin: '10000000-0000-4000-8000-000000000001',
  rohanKulkarni: '10000000-0000-4000-8000-000000000002',
  ananyaIyer: '10000000-0000-4000-8000-000000000003',
  vikramDesai: '10000000-0000-4000-8000-000000000004',
  arjunVerma: '10000000-0000-4000-8000-000000000005',
  tKulkarniCA: '20000000-0000-4000-8000-000000000319',
  tMeridianEnt: '20000000-0000-4000-8000-000000000881',
  tVermaSMB: '20000000-0000-4000-8000-000000001042',
  orgKdaHq: '30000000-0000-4000-8000-000000004400',
  orgApexTextiles: '30000000-0000-4000-8000-000000004412',
  orgNarmadaLog: '30000000-0000-4000-8000-000000004413',
  orgHorizonTools: '30000000-0000-4000-8000-000000004414',
  orgMeridianHq: '30000000-0000-4000-8000-000000008801',
  orgMeridianRoads: '30000000-0000-4000-8000-000000008802',
  orgMeridianEnergy: '30000000-0000-4000-8000-000000008803',
  orgVermaPrimary: '30000000-0000-4000-8000-000000001042',
  planStarter: '40000000-0000-4000-8000-000000000001',
  planGrowth: '40000000-0000-4000-8000-000000000002',
  planEnterprise: '40000000-0000-4000-8000-000000000003',
  planCaPro: '40000000-0000-4000-8000-000000000004',
  roleSuperAdmin: '50000000-0000-4000-8000-000000000001',
  roleTenantAdmin: '50000000-0000-4000-8000-000000000002',
  roleCaPartner: '50000000-0000-4000-8000-000000000003',
  roleReadOnlyAuditor: '50000000-0000-4000-8000-000000000004',
  roleCaAuditManager: '50000000-0000-4000-8000-000000000101',
  roleCaFullManager: '50000000-0000-4000-8000-000000000102',
  subKda: '60000000-0000-4000-8000-000000000319',
  subMeridian: '60000000-0000-4000-8000-000000000881',
  subVerma: '60000000-0000-4000-8000-000000001042',
};

const sha256 = (val: string) => createHash('sha256').update(val).digest('hex');

export async function runSeed(connectionString: string): Promise<void> {
  const { pool, db } = createDbPool(connectionString);
  const IDS = SEED_IDS;

  try {
    await withRlsContext(
      db,
      { userId: IDS.superAdmin, isPlatformSuperAdmin: true },
      async (tx) => {
        await tx
          .insert(s.saasModules)
          .values([
            { code: 'platform_core', displayName: 'Platform Core Service', description: 'Tenancy, OIDC identity links, RBAC, subscriptions, config, audit, and notifications.', apiVersion: 'v1.4', healthStatus: 'OPERATIONAL', includedFeatures: ['Tenancy & Orgs', 'RBAC Matrix', 'Subscriptions', 'Audit Logs', 'Notifications'], isCoreService: true, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { code: 'tax_financial', displayName: 'Tax & Financial Intelligence', description: 'Advance Tax, Income Tax, GST, Decimal.js computation engine, and regime optimization.', apiVersion: 'v1.2', healthStatus: 'OPERATIONAL', includedFeatures: ['Advance Tax', 'Income Tax', 'GST', 'Scenario Optimization'], isCoreService: false, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { code: 'payroll_hrms', displayName: 'Payroll & HRMS Service', description: 'Employee lifecycle, salary structures, payroll processing, and statutory compliance.', apiVersion: 'v1.1', healthStatus: 'OPERATIONAL', includedFeatures: ['Employee Lifecycle', 'Payroll Runs', 'Statutory Compliance'], isCoreService: false, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { code: 'ca_practice', displayName: 'CA Practice & Accounting', description: 'Client engagement management, CA practice tasks, accounting ledgers, and reconciliation.', apiVersion: 'v1.0', healthStatus: 'OPERATIONAL', includedFeatures: ['Client Engagements', 'Practice Tasks', 'Accounting & Reconciliation'], isCoreService: false, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.subscriptionPlans)
          .values([
            { id: IDS.planStarter, code: 'STARTER_SMB', name: 'Starter Business', targetCustomerType: 'INDIVIDUAL_SMB', defaultSeatLimit: 10, defaultOrgLimit: 1, annualBasePrice: new Decimal('36000.00').toFixed(2), monthlyBasePrice: new Decimal('3500.00').toFixed(2), currencyCode: 'INR', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.planGrowth, code: 'GROWTH_BUSINESS', name: 'Growth Multi-Branch', targetCustomerType: 'INDIVIDUAL_SMB', defaultSeatLimit: 25, defaultOrgLimit: 3, annualBasePrice: new Decimal('84000.00').toFixed(2), monthlyBasePrice: new Decimal('8000.00').toFixed(2), currencyCode: 'INR', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.planEnterprise, code: 'ENTERPRISE_MULTI_ENTITY', name: 'Enterprise Multi-Entity', targetCustomerType: 'ENTERPRISE', defaultSeatLimit: 150, defaultOrgLimit: 10, annualBasePrice: new Decimal('240000.00').toFixed(2), monthlyBasePrice: new Decimal('22500.00').toFixed(2), currencyCode: 'INR', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.planCaPro, code: 'CA_PRACTICE_PRO', name: 'CA Practice Pro', targetCustomerType: 'CA_FIRM', defaultSeatLimit: 25, defaultOrgLimit: 50, annualBasePrice: new Decimal('180000.00').toFixed(2), monthlyBasePrice: new Decimal('16500.00').toFixed(2), currencyCode: 'INR', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        const permSeed: Array<{
          moduleCode: string;
          resourceKey: string;
          resourceLabel: string;
          action: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'MANAGE';
          permissionCode: string;
          isHighPrivilege?: boolean;
        }> = [
          { moduleCode: 'platform_core', resourceKey: 'dashboard', resourceLabel: 'Platform Dashboard', action: 'VIEW', permissionCode: 'dashboard:view' },
          { moduleCode: 'platform_core', resourceKey: 'tenants', resourceLabel: 'Tenants Directory', action: 'VIEW', permissionCode: 'tenants:view' },
          { moduleCode: 'platform_core', resourceKey: 'tenants', resourceLabel: 'Tenants Directory', action: 'CREATE', permissionCode: 'tenants:create', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'tenants', resourceLabel: 'Tenants Directory', action: 'EDIT', permissionCode: 'tenants:edit', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'tenants', resourceLabel: 'Tenants Directory', action: 'MANAGE', permissionCode: 'tenants:manage', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'organizations', resourceLabel: 'Organization Profile & Tree', action: 'VIEW', permissionCode: 'organizations:view' },
          { moduleCode: 'platform_core', resourceKey: 'organizations', resourceLabel: 'Organization Profile & Tree', action: 'CREATE', permissionCode: 'organizations:create' },
          { moduleCode: 'platform_core', resourceKey: 'organizations', resourceLabel: 'Organization Profile & Tree', action: 'EDIT', permissionCode: 'organizations:edit' },
          { moduleCode: 'platform_core', resourceKey: 'users', resourceLabel: 'Users & Invitations', action: 'VIEW', permissionCode: 'users:view' },
          { moduleCode: 'platform_core', resourceKey: 'users', resourceLabel: 'Users & Invitations', action: 'CREATE', permissionCode: 'users:create' },
          { moduleCode: 'platform_core', resourceKey: 'users', resourceLabel: 'Users & Invitations', action: 'EDIT', permissionCode: 'users:edit' },
          { moduleCode: 'platform_core', resourceKey: 'roles', resourceLabel: 'Roles & Permission Matrix', action: 'VIEW', permissionCode: 'roles:view' },
          { moduleCode: 'platform_core', resourceKey: 'roles', resourceLabel: 'Roles & Permission Matrix', action: 'CREATE', permissionCode: 'roles:create', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'roles', resourceLabel: 'Roles & Permission Matrix', action: 'EDIT', permissionCode: 'roles:edit', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'roles', resourceLabel: 'Roles & Permission Matrix', action: 'DELETE', permissionCode: 'roles:delete', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'memberships', resourceLabel: 'Org User Memberships', action: 'VIEW', permissionCode: 'memberships:view' },
          { moduleCode: 'platform_core', resourceKey: 'memberships', resourceLabel: 'Org User Memberships', action: 'CREATE', permissionCode: 'memberships:create' },
          { moduleCode: 'platform_core', resourceKey: 'memberships', resourceLabel: 'Org User Memberships', action: 'EDIT', permissionCode: 'memberships:edit' },
          { moduleCode: 'platform_core', resourceKey: 'memberships', resourceLabel: 'Org User Memberships', action: 'DELETE', permissionCode: 'memberships:delete' },
          { moduleCode: 'platform_core', resourceKey: 'subscriptions', resourceLabel: 'Product Subscriptions', action: 'VIEW', permissionCode: 'subscriptions:view' },
          { moduleCode: 'platform_core', resourceKey: 'subscriptions', resourceLabel: 'Product Subscriptions', action: 'MANAGE', permissionCode: 'subscriptions:manage', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'entitlements', resourceLabel: 'Module Entitlements', action: 'VIEW', permissionCode: 'entitlements:view' },
          { moduleCode: 'platform_core', resourceKey: 'entitlements', resourceLabel: 'Module Entitlements', action: 'EDIT', permissionCode: 'entitlements:edit', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'config', resourceLabel: 'Platform Configuration', action: 'VIEW', permissionCode: 'config:view' },
          { moduleCode: 'platform_core', resourceKey: 'config', resourceLabel: 'Platform Configuration', action: 'MANAGE', permissionCode: 'config:manage', isHighPrivilege: true },
          { moduleCode: 'platform_core', resourceKey: 'audit.logs', resourceLabel: 'Audit Logs', action: 'VIEW', permissionCode: 'audit.logs:view' },
          { moduleCode: 'platform_core', resourceKey: 'audit.logs', resourceLabel: 'Audit Logs', action: 'EXPORT', permissionCode: 'audit.logs:export' },
          { moduleCode: 'platform_core', resourceKey: 'notifications', resourceLabel: 'Notification Administration', action: 'VIEW', permissionCode: 'notifications:view' },
          { moduleCode: 'platform_core', resourceKey: 'notifications', resourceLabel: 'Notification Administration', action: 'MANAGE', permissionCode: 'notifications:manage' },
          { moduleCode: 'tax_financial', resourceKey: 'tax.scenarios', resourceLabel: 'Advance Tax & Regime Scenarios', action: 'VIEW', permissionCode: 'tax.scenarios:view' },
          { moduleCode: 'tax_financial', resourceKey: 'tax.scenarios', resourceLabel: 'Advance Tax & Regime Scenarios', action: 'CREATE', permissionCode: 'tax.scenarios:create' },
          { moduleCode: 'tax_financial', resourceKey: 'tax.scenarios', resourceLabel: 'Advance Tax & Regime Scenarios', action: 'EDIT', permissionCode: 'tax.scenarios:edit' },
          { moduleCode: 'tax_financial', resourceKey: 'tax.scenarios', resourceLabel: 'Advance Tax & Regime Scenarios', action: 'APPROVE', permissionCode: 'tax.scenarios:approve' },
          { moduleCode: 'tax_financial', resourceKey: 'tax.rules', resourceLabel: 'Tax Rule Version Reference', action: 'VIEW', permissionCode: 'tax.rules:view' },
          { moduleCode: 'payroll_hrms', resourceKey: 'payroll.runs', resourceLabel: 'Payroll Runs & Payslips', action: 'VIEW', permissionCode: 'payroll.runs:view' },
          { moduleCode: 'payroll_hrms', resourceKey: 'payroll.runs', resourceLabel: 'Payroll Runs & Payslips', action: 'MANAGE', permissionCode: 'payroll.runs:manage', isHighPrivilege: true },
          { moduleCode: 'ca_practice', resourceKey: 'practice.clients', resourceLabel: 'Client Compliance & Engagements', action: 'VIEW', permissionCode: 'practice.clients:view' },
          { moduleCode: 'ca_practice', resourceKey: 'practice.clients', resourceLabel: 'Client Compliance & Engagements', action: 'MANAGE', permissionCode: 'practice.clients:manage' },
          { moduleCode: 'ca_practice', resourceKey: 'accounting.ledgers', resourceLabel: 'Accounting Ledgers', action: 'APPROVE', permissionCode: 'accounting.ledgers:approve' },
        ];

        await tx
          .insert(s.permissions)
          .values(permSeed.map((p) => ({ ...p, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin })))
          .onConflictDoNothing();

        const allPerms = await tx.select().from(s.permissions);
        const permByCode = new Map(allPerms.map((p) => [p.permissionCode, p.id]));

        await tx
          .insert(s.tenants)
          .values([
            { id: IDS.tKulkarniCA, tenantCode: 'TNT-0319', legalName: 'Kulkarni, Deshmukh & Associates LLP', slug: 'kulkarni-associates', customerType: 'CA_FIRM', status: 'ACTIVE', primaryRegion: 'ap-south-1', defaultCurrency: 'INR', fyStartMonth: 4, defaultTimezone: 'Asia/Kolkata', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.tMeridianEnt, tenantCode: 'TNT-0881', legalName: 'Meridian Infrastructure Group', slug: 'meridian-infra', customerType: 'ENTERPRISE', status: 'ACTIVE', primaryRegion: 'ap-south-1', defaultCurrency: 'INR', fyStartMonth: 4, defaultTimezone: 'Asia/Kolkata', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.tVermaSMB, tenantCode: 'TNT-1042', legalName: 'Verma Precision Components Pvt. Ltd.', slug: 'verma-precision', customerType: 'INDIVIDUAL_SMB', status: 'ACTIVE', primaryRegion: 'ap-south-1', defaultCurrency: 'INR', fyStartMonth: 4, defaultTimezone: 'Asia/Kolkata', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.organizations)
          .values([
            { id: IDS.orgKdaHq, tenantId: IDS.tKulkarniCA, orgCode: 'ORG-4400', legalName: 'Kulkarni, Deshmukh & Associates — Practice HQ', orgType: 'CA_PRACTICE_HQ', taxIdentifiers: { LLPIN: 'AAK-8821' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgApexTextiles, tenantId: IDS.tKulkarniCA, parentOrgId: IDS.orgKdaHq, orgCode: 'ORG-4412', legalName: 'Apex Textiles Ltd.', orgType: 'CA_CLIENT_ORG', taxIdentifiers: { GSTIN: '27AABCA4412K1Z8' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgNarmadaLog, tenantId: IDS.tKulkarniCA, parentOrgId: IDS.orgKdaHq, orgCode: 'ORG-4413', legalName: 'Narmada Logistics Pvt. Ltd.', orgType: 'CA_CLIENT_ORG', taxIdentifiers: { GSTIN: '24AABCN4413M1Z2' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgHorizonTools, tenantId: IDS.tKulkarniCA, parentOrgId: IDS.orgKdaHq, orgCode: 'ORG-4414', legalName: 'Horizon Precision Tools LLP', orgType: 'CA_CLIENT_ORG', taxIdentifiers: { GSTIN: '27AABCH4414P1Z9' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgMeridianHq, tenantId: IDS.tMeridianEnt, orgCode: 'ORG-8801', legalName: 'Meridian Infra HQ', orgType: 'CORPORATE_HQ', taxIdentifiers: { GSTIN: '07AABCM8801A1Z5' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgMeridianRoads, tenantId: IDS.tMeridianEnt, parentOrgId: IDS.orgMeridianHq, orgCode: 'ORG-8802', legalName: 'Meridian Roads Pvt. Ltd.', orgType: 'SUBSIDIARY', taxIdentifiers: { GSTIN: '07AABCM8802B1Z3' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgMeridianEnergy, tenantId: IDS.tMeridianEnt, parentOrgId: IDS.orgMeridianHq, orgCode: 'ORG-8803', legalName: 'Meridian Energy LLP', orgType: 'SUBSIDIARY', taxIdentifiers: { GSTIN: '06AABCM8803C1Z1' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.orgVermaPrimary, tenantId: IDS.tVermaSMB, orgCode: 'ORG-1042', legalName: 'Verma Precision Components Pvt. Ltd.', orgType: 'PRIMARY_BUSINESS', taxIdentifiers: { GSTIN: '07AABCV1042D1Z7' }, status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.users)
          .values([
            { id: IDS.superAdmin, email: 'rajesh.kapoor@advantax-metrix.io', fullName: 'Rajesh Kapoor', isPlatformSuperAdmin: true, mfaEnrolled: true, status: 'ACTIVE', uiNavPinned: false, uiThemeMode: 'DARK', lastActiveAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.rohanKulkarni, primaryTenantId: IDS.tKulkarniCA, email: 'rohan.kulkarni@kda-llp.in', fullName: 'Rohan Kulkarni', isPlatformSuperAdmin: false, mfaEnrolled: true, status: 'ACTIVE', uiNavPinned: true, uiThemeMode: 'LIGHT', lastWorkspaceTenantId: IDS.tKulkarniCA, lastActiveAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.ananyaIyer, primaryTenantId: IDS.tKulkarniCA, email: 'ananya.iyer@kda-llp.in', fullName: 'Ananya Iyer', isPlatformSuperAdmin: false, mfaEnrolled: true, status: 'ACTIVE', uiNavPinned: false, uiThemeMode: 'LIGHT', lastWorkspaceTenantId: IDS.tKulkarniCA, lastActiveAt: new Date(), createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { id: IDS.vikramDesai, primaryTenantId: IDS.tMeridianEnt, email: 'vikram.desai@meridian.in', fullName: 'Vikram Desai', isPlatformSuperAdmin: false, mfaEnrolled: true, status: 'ACTIVE', uiNavPinned: true, uiThemeMode: 'DARK', lastWorkspaceTenantId: IDS.tMeridianEnt, lastActiveAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.arjunVerma, primaryTenantId: IDS.tVermaSMB, email: 'arjun.verma@vermaprecision.in', fullName: 'Arjun Verma', isPlatformSuperAdmin: false, mfaEnrolled: true, status: 'ACTIVE', uiNavPinned: false, uiThemeMode: 'LIGHT', lastWorkspaceTenantId: IDS.tVermaSMB, lastActiveAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.userOidcIdentities)
          .values([
            { userId: IDS.superAdmin, providerType: 'MANAGED_OIDC', issuerUrl: 'https://id.metrix-erp.cloud/realms/platform-core', oidcSubject: 'usr_super_01', emailVerified: true, mfaVerifiedAt: new Date(), syncStatus: 'VERIFIED', lastSyncedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { userId: IDS.rohanKulkarni, tenantId: IDS.tKulkarniCA, providerType: 'MANAGED_OIDC', issuerUrl: 'https://id.metrix-erp.cloud/realms/platform-core', oidcSubject: 'usr_kda_01', emailVerified: true, mfaVerifiedAt: new Date(), syncStatus: 'VERIFIED', lastSyncedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { userId: IDS.ananyaIyer, tenantId: IDS.tKulkarniCA, providerType: 'MANAGED_OIDC', issuerUrl: 'https://id.metrix-erp.cloud/realms/platform-core', oidcSubject: 'usr_kda_02', emailVerified: true, mfaVerifiedAt: new Date(), syncStatus: 'VERIFIED', lastSyncedAt: new Date(), createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { userId: IDS.vikramDesai, tenantId: IDS.tMeridianEnt, providerType: 'ENTRA_ID_SSO', issuerUrl: 'https://login.microsoftonline.com/meridian-tenant/v2.0', oidcSubject: 'entra_meridian_01', emailVerified: true, mfaVerifiedAt: new Date(), syncStatus: 'VERIFIED', lastSyncedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { userId: IDS.arjunVerma, tenantId: IDS.tVermaSMB, providerType: 'GOOGLE_WORKSPACE_SSO', issuerUrl: 'https://accounts.google.com', oidcSubject: 'gws_verma_01', emailVerified: true, mfaVerifiedAt: new Date(), syncStatus: 'VERIFIED', lastSyncedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.roles)
          .values([
            { id: IDS.roleSuperAdmin, tenantId: null, name: 'Platform Super Admin', description: 'Global platform administrator.', scope: 'PLATFORM', isSystemDefault: true, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.roleTenantAdmin, tenantId: null, name: 'Tenant Admin', description: 'Full administrative owner within a tenant.', scope: 'TENANT', isSystemDefault: true, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.roleCaPartner, tenantId: null, name: 'CA Partner', description: 'Practice owner across CA HQ & client orgs.', scope: 'TENANT', isSystemDefault: true, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.roleReadOnlyAuditor, tenantId: null, name: 'Read-Only Auditor', description: 'Read-only access to assigned orgs.', scope: 'ORGANIZATION', isSystemDefault: true, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.roleCaAuditManager, tenantId: IDS.tKulkarniCA, name: 'CA Audit Manager', description: 'Custom org-scoped CA audit role.', scope: 'ORGANIZATION', isSystemDefault: false, clonedFromRoleId: IDS.roleReadOnlyAuditor, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { id: IDS.roleCaFullManager, tenantId: IDS.tKulkarniCA, name: 'Full Manager', description: 'Custom org-scoped full manager.', scope: 'ORGANIZATION', isSystemDefault: false, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
          ])
          .onConflictDoNothing();

        const caAuditPermCodes = [
          'organizations:view', 'organizations:edit', 'memberships:view', 'memberships:create',
          'memberships:edit', 'audit.logs:view', 'audit.logs:export', 'tax.scenarios:view',
          'tax.scenarios:create', 'tax.scenarios:edit', 'tax.scenarios:approve', 'tax.rules:view',
          'practice.clients:view', 'practice.clients:manage', 'accounting.ledgers:approve',
        ];
        const rpRows: Array<typeof s.rolePermissions.$inferInsert> = [];
        for (const p of allPerms) {
          rpRows.push({ roleId: IDS.roleSuperAdmin, permissionId: p.id, tenantId: null, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin });
          if (!p.permissionCode.startsWith('tenants:create') && !p.permissionCode.startsWith('tenants:manage')) {
            rpRows.push({ roleId: IDS.roleTenantAdmin, permissionId: p.id, tenantId: null, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin });
            rpRows.push({ roleId: IDS.roleCaPartner, permissionId: p.id, tenantId: null, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin });
          }
        }
        for (const code of caAuditPermCodes) {
          const pid = permByCode.get(code);
          if (pid) {
            rpRows.push({ roleId: IDS.roleCaAuditManager, permissionId: pid, tenantId: IDS.tKulkarniCA, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni });
            rpRows.push({ roleId: IDS.roleCaFullManager, permissionId: pid, tenantId: IDS.tKulkarniCA, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni });
          }
        }
        const payView = permByCode.get('payroll.runs:view');
        if (payView) {
          rpRows.push({ roleId: IDS.roleCaFullManager, permissionId: payView, tenantId: IDS.tKulkarniCA, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni });
        }
        await tx.insert(s.rolePermissions).values(rpRows).onConflictDoNothing();

        await tx
          .insert(s.organizationMemberships)
          .values([
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgKdaHq, userId: IDS.rohanKulkarni, roleId: IDS.roleCaPartner, membershipType: 'TENANT_ADMIN', status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgApexTextiles, userId: IDS.ananyaIyer, roleId: IDS.roleCaAuditManager, membershipType: 'CA_PRACTICE_STAFF', status: 'ACTIVE', accessExpiresOn: null, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgNarmadaLog, userId: IDS.ananyaIyer, roleId: IDS.roleCaFullManager, membershipType: 'CA_PRACTICE_STAFF', status: 'ACTIVE', accessExpiresOn: '2027-03-31', createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tMeridianEnt, organizationId: IDS.orgMeridianHq, userId: IDS.vikramDesai, roleId: IDS.roleTenantAdmin, membershipType: 'TENANT_ADMIN', status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tVermaSMB, organizationId: IDS.orgVermaPrimary, userId: IDS.arjunVerma, roleId: IDS.roleTenantAdmin, membershipType: 'TENANT_ADMIN', status: 'ACTIVE', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.userInvitations)
          .values([
            {
              tenantId: IDS.tKulkarniCA,
              email: 'meera.nair@kda-llp.in',
              invitedByUserId: IDS.rohanKulkarni,
              tokenHash: sha256('seed-invite-token-meera-nair-v1'),
              targetOrgRoles: [{ organizationId: IDS.orgApexTextiles, roleId: IDS.roleCaAuditManager, accessExpiresOn: null }],
              welcomeMessage: 'Welcome to Kulkarni, Deshmukh & Associates LLP.',
              status: 'SENT',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdBy: IDS.rohanKulkarni,
              updatedBy: IDS.rohanKulkarni,
            },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.tenantSubscriptions)
          .values([
            { id: IDS.subKda, tenantId: IDS.tKulkarniCA, planId: IDS.planCaPro, billingCycle: 'ANNUAL', status: 'ACTIVE', contractValue: new Decimal('180000.00').toFixed(2), currencyCode: 'INR', seatLimit: 25, orgLimit: 50, currentPeriodStartOn: '2026-04-01', currentPeriodEndOn: '2027-03-31', renewalDate: '2027-04-01', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.subMeridian, tenantId: IDS.tMeridianEnt, planId: IDS.planEnterprise, billingCycle: 'ANNUAL', status: 'ACTIVE', contractValue: new Decimal('240000.00').toFixed(2), currencyCode: 'INR', seatLimit: 150, orgLimit: 10, currentPeriodStartOn: '2026-04-01', currentPeriodEndOn: '2027-03-31', renewalDate: '2027-04-01', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { id: IDS.subVerma, tenantId: IDS.tVermaSMB, planId: IDS.planStarter, billingCycle: 'ANNUAL', status: 'ACTIVE', contractValue: new Decimal('36000.00').toFixed(2), currencyCode: 'INR', seatLimit: 10, orgLimit: 1, currentPeriodStartOn: '2026-04-01', currentPeriodEndOn: '2027-03-31', renewalDate: '2027-04-01', createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.tenantModuleSubscriptions)
          .values([
            { tenantId: IDS.tKulkarniCA, subscriptionId: IDS.subKda, moduleCode: 'tax_financial', status: 'ACTIVE', moduleSeatLimit: 25, featureFlags: { advanceTax: true, gst: true }, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tKulkarniCA, subscriptionId: IDS.subKda, moduleCode: 'payroll_hrms', status: 'ACTIVE', moduleSeatLimit: 15, featureFlags: { statutoryCompliance: true }, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tKulkarniCA, subscriptionId: IDS.subKda, moduleCode: 'ca_practice', status: 'ACTIVE', moduleSeatLimit: 25, featureFlags: { multiClientPortal: true }, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tMeridianEnt, subscriptionId: IDS.subMeridian, moduleCode: 'tax_financial', status: 'ACTIVE', moduleSeatLimit: 150, featureFlags: { advanceTax: true }, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tMeridianEnt, subscriptionId: IDS.subMeridian, moduleCode: 'payroll_hrms', status: 'ACTIVE', moduleSeatLimit: 100, featureFlags: {}, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tMeridianEnt, subscriptionId: IDS.subMeridian, moduleCode: 'ca_practice', status: 'NOT_SUBSCRIBED', featureFlags: {}, createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
            { tenantId: IDS.tVermaSMB, subscriptionId: IDS.subVerma, moduleCode: 'tax_financial', status: 'ACTIVE', moduleSeatLimit: 10, featureFlags: { advanceTax: true }, activatedAt: new Date(), createdBy: IDS.superAdmin, updatedBy: IDS.superAdmin },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.organizationModuleEntitlements)
          .values([
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgApexTextiles, moduleCode: 'tax_financial', isEnabled: true, allocatedSeatLimit: 10, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgApexTextiles, moduleCode: 'payroll_hrms', isEnabled: false, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgApexTextiles, moduleCode: 'ca_practice', isEnabled: true, allocatedSeatLimit: 10, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgNarmadaLog, moduleCode: 'tax_financial', isEnabled: true, allocatedSeatLimit: 8, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tKulkarniCA, organizationId: IDS.orgNarmadaLog, moduleCode: 'payroll_hrms', isEnabled: true, allocatedSeatLimit: 8, createdBy: IDS.rohanKulkarni, updatedBy: IDS.rohanKulkarni },
            { tenantId: IDS.tMeridianEnt, organizationId: IDS.orgMeridianHq, moduleCode: 'tax_financial', isEnabled: true, allocatedSeatLimit: 45, createdBy: IDS.vikramDesai, updatedBy: IDS.vikramDesai },
            { tenantId: IDS.tMeridianEnt, organizationId: IDS.orgMeridianHq, moduleCode: 'payroll_hrms', isEnabled: true, allocatedSeatLimit: 45, createdBy: IDS.vikramDesai, updatedBy: IDS.vikramDesai },
          ])
          .onConflictDoNothing();

        await tx
          .insert(s.auditLogs)
          .values([
            {
              eventCode: 'EVT-98412',
              tenantId: IDS.tKulkarniCA,
              organizationId: IDS.orgApexTextiles,
              actorUserId: IDS.rohanKulkarni,
              actorOidcSub: 'usr_kda_01',
              actorNameSnapshot: 'Rohan Kulkarni',
              actorRoleSnapshot: 'CA Partner',
              serviceSource: 'platform_core',
              actionCategory: 'RBAC',
              eventAction: 'role.permissions.updated',
              targetResourceType: 'role',
              targetResourceId: IDS.roleCaAuditManager,
              outcome: 'SUCCESS',
              httpStatusCode: 200,
              otelTraceId: '4bf92f3577b34da6a3ce929d0e0e4736',
              ipAddress: '103.21.58.14',
              beforeState: { 'tax.scenarios:approve': false },
              afterState: { 'tax.scenarios:approve': true },
              retentionUntilOn: '2033-11-22',
              createdBy: IDS.rohanKulkarni,
            },
          ])
          .onConflictDoNothing();
      },
    );

    // Live RLS & Audit Immutability Assertions
    const ananyaOrgs = await withRlsContext(
      db,
      { userId: IDS.ananyaIyer, tenantId: IDS.tKulkarniCA, isPlatformSuperAdmin: false, isTenantOwner: false },
      async (tx) => tx.select({ orgCode: s.organizations.orgCode }).from(s.organizations),
    );
    const ananyaCodes = ananyaOrgs.map((o) => o.orgCode).sort();
    if (JSON.stringify(ananyaCodes) !== JSON.stringify(['ORG-4412', 'ORG-4413'])) {
      throw new Error(`CA Multi-Client RLS failed: got ${JSON.stringify(ananyaCodes)}`);
    }

    const meridianTenants = await withRlsContext(
      db,
      { userId: IDS.vikramDesai, tenantId: IDS.tMeridianEnt, isPlatformSuperAdmin: false, isTenantOwner: true },
      async (tx) => tx.select({ tenantCode: s.tenants.tenantCode }).from(s.tenants),
    );
    if (JSON.stringify(meridianTenants.map((t) => t.tenantCode)) !== JSON.stringify(['TNT-0881'])) {
      throw new Error('Cross-tenant RLS failed for Meridian Owner.');
    }

    let auditBlocked = false;
    try {
      await withRlsContext(db, { userId: IDS.superAdmin, isPlatformSuperAdmin: true }, async (tx) => {
        await tx.update(s.auditLogs).set({ outcome: 'FAILED' }).where(eq(s.auditLogs.eventCode, 'EVT-98412'));
      });
    } catch (e) {
      const errObj = e as { message?: string; cause?: { message?: string } };
      auditBlocked = [String(e), errObj?.message, errObj?.cause?.message].filter(Boolean).join(' ').includes('append-only');
    }
    if (!auditBlocked) {
      throw new Error('Audit immutability trigger did not block UPDATE on core.audit_logs!');
    }
  } finally {
    await pool.end();
  }
}

export const seedPlatformCore = runSeed;

if (require.main === module) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL must be set.');
    process.exit(1);
  }
  runSeed(dbUrl)
    .then(() => console.log('✓ Idempotent seed & all 3 live RLS/audit assertions PASSED.'))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
