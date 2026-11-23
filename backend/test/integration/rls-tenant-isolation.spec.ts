// test/integration/rls-tenant-isolation.spec.ts
//
// Purpose: Verifies runtime PostgreSQL FORCE RLS enforcement, CA multi-client isolation, entitlement views, composite FKs, and audit immutability.
//
// Context: Executes strictly as metrix_app (NOBYPASSRLS) to prove database-level tenant boundaries cannot be bypassed even without app WHERE filters.
//
// Implementation Specs: Vitest 5 + Testcontainers integration suite exercising withRlsContext() across CA staff, Enterprise owner, and Super Admin sessions.

import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbPool, withRlsContext } from '../../src/db';
import * as s from '../../src/db/schema';
import { SEED_IDS } from '../../src/db/seed';
import { startProvisionedPlatformCoreDb, type ProvisionedTestDb } from './pg-test-helper';

describe('Phase 3 Integration — PostgreSQL FORCE RLS, CA Multi-Client & Immutability', () => {
  let ctx: ProvisionedTestDb;

  beforeAll(async () => {
    ctx = await startProvisionedPlatformCoreDb();
  }, 120000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it('isolates CA Firm staff (Ananya Iyer) strictly to assigned client orgs (ORG-4412, ORG-4413)', async () => {
    const { pool, db } = createDbPool(ctx.appUrl);
    try {
      const visible = await withRlsContext(
        db,
        { userId: SEED_IDS.ananyaIyer, tenantId: SEED_IDS.tKulkarniCA, isPlatformSuperAdmin: false, isTenantOwner: false },
        async (tx) => tx.select({ orgCode: s.organizations.orgCode }).from(s.organizations),
      );
      expect(visible.map((o) => o.orgCode).sort()).toEqual(['ORG-4412', 'ORG-4413']);
    } finally {
      await pool.end();
    }
  });

  it('isolates Enterprise Tenant Owner (Vikram Desai) strictly to TNT-0881 with zero cross-tenant leaks', async () => {
    const { pool, db } = createDbPool(ctx.appUrl);
    try {
      const visibleTenants = await withRlsContext(
        db,
        { userId: SEED_IDS.vikramDesai, tenantId: SEED_IDS.tMeridianEnt, isPlatformSuperAdmin: false, isTenantOwner: true },
        async (tx) => tx.select({ tenantCode: s.tenants.tenantCode }).from(s.tenants),
      );
      expect(visibleTenants.map((t) => t.tenantCode)).toEqual(['TNT-0881']);

      const noContextTenants = await withRlsContext(
        db,
        { userId: SEED_IDS.vikramDesai, tenantId: null, isPlatformSuperAdmin: false, isTenantOwner: false },
        async (tx) => tx.select({ tenantCode: s.tenants.tenantCode }).from(s.tenants),
      );
      expect(noContextTenants).toEqual([]);
    } finally {
      await pool.end();
    }
  });

  it('enforces organization-level module entitlement gating in v_effective_user_org_permissions', async () => {
    const { pool, db } = createDbPool(ctx.appUrl);
    try {
      const rows = await withRlsContext(
        db,
        { userId: SEED_IDS.ananyaIyer, tenantId: SEED_IDS.tKulkarniCA, isPlatformSuperAdmin: false, isTenantOwner: false },
        async (tx) =>
          tx.execute<{ organization_id: string; module_code: string; is_entitlement_active: boolean }>(sql`
            SELECT DISTINCT organization_id, module_code, is_entitlement_active
            FROM core.v_effective_user_org_permissions
            WHERE user_id = ${SEED_IDS.ananyaIyer}::uuid
              AND module_code IN ('tax_financial', 'payroll_hrms')
          `),
      );
      const apexTax = rows.rows.find((r) => r.organization_id === SEED_IDS.orgApexTextiles && r.module_code === 'tax_financial');
      const narmadaPayroll = rows.rows.find((r) => r.organization_id === SEED_IDS.orgNarmadaLog && r.module_code === 'payroll_hrms');
      expect(apexTax?.is_entitlement_active).toBe(true);
      expect(narmadaPayroll?.is_entitlement_active).toBe(true);
    } finally {
      await pool.end();
    }
  });

  it('unconditionally blocks UPDATE on immutable core.audit_logs via statement-level trigger', async () => {
    const { pool, db } = createDbPool(ctx.appUrl);
    try {
      let errText = '';
      try {
        await withRlsContext(db, { userId: SEED_IDS.superAdmin, isPlatformSuperAdmin: true }, async (tx) => {
          await tx.update(s.auditLogs).set({ outcome: 'FAILED' }).where(eq(s.auditLogs.eventCode, 'EVT-98412'));
        });
      } catch (err) {
        const e = err as { message?: string; cause?: { message?: string } };
        errText = [String(err), e?.message, e?.cause?.message].filter(Boolean).join(' ');
      }
      expect(errText).toContain('append-only');
    } finally {
      await pool.end();
    }
  });

  it('prevents cross-tenant organization_memberships writes via composite FK (tenant_id, organization_id)', async () => {
    const { pool, db } = createDbPool(ctx.appUrl);
    try {
      await expect(
        withRlsContext(db, { userId: SEED_IDS.superAdmin, isPlatformSuperAdmin: true }, async (tx) => {
          await tx.insert(s.organizationMemberships).values({
            tenantId: SEED_IDS.tMeridianEnt,
            organizationId: SEED_IDS.orgApexTextiles, // belongs to Kulkarni CA, NOT Meridian!
            userId: SEED_IDS.vikramDesai,
            roleId: SEED_IDS.roleTenantAdmin,
            createdBy: SEED_IDS.superAdmin,
            updatedBy: SEED_IDS.superAdmin,
          });
        }),
      ).rejects.toThrow();
    } finally {
      await pool.end();
    }
  });
});
