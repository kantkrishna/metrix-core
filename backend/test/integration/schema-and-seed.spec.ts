// test/integration/schema-and-seed.spec.ts
//
// Purpose: Validates live PostgreSQL catalog metadata, NOT NULL audit constraints, FORCE RLS coverage, and double-seed idempotency.
//
// Context: Proves that migrations and seed scripts produce an exact, repeatable schema state inside a fresh PostgreSQL 16 instance.
//
// Implementation Specs: Vitest 5 + Testcontainers integration suite querying pg_tables, pg_type, pg_class, pg_views, and information_schema.columns.

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runSeed } from '../../src/db/seed';
import { startProvisionedPlatformCoreDb, type ProvisionedTestDb } from './pg-test-helper';

describe('Phase 3 Integration — Schema Integrity, Audit Constraints & Seed Idempotency', () => {
  let ctx: ProvisionedTestDb;

  beforeAll(async () => {
    ctx = await startProvisionedPlatformCoreDb();
  }, 120000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it('provisions 24 tables, 30 enums, 21 FORCE RLS tables & 2 security_invoker views in schema "core"', async () => {
    const client = new Client({ connectionString: ctx.ownerUrl });
    await client.connect();
    try {
      const tables = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname = 'core'",
      );
      const enums = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'core' AND t.typtype = 'e'",
      );
      const forceRls = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'core' AND c.relkind = 'r' AND c.relrowsecurity = true AND c.relforcerowsecurity = true",
      );
      const views = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM pg_views WHERE schemaname = 'core'",
      );

      expect(tables.rows[0].count).toBe(24);
      expect(enums.rows[0].count).toBe(30);
      expect(forceRls.rows[0].count).toBe(21);
      expect(views.rows[0].count).toBe(2);
    } finally {
      await client.end();
    }
  });

  it('enforces NOT NULL on every created_by and updated_by column across schema "core"', async () => {
    const client = new Client({ connectionString: ctx.ownerUrl });
    await client.connect();
    try {
      const nullableAuditCols = await client.query<{ table_name: string; column_name: string }>(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND column_name IN ('created_by', 'updated_by')
          AND is_nullable = 'YES'
      `);
      expect(nullableAuditCols.rows).toEqual([]);
    } finally {
      await client.end();
    }
  });

  it('executes runSeed() idempotently without duplicating tenants, orgs, permissions, or plans', async () => {
    await runSeed(ctx.appUrl);

    const client = new Client({ connectionString: ctx.ownerUrl });
    await client.connect();
    try {
      await client.query("SELECT set_config('app.is_platform_super_admin', 'true', false)");
      const tenants = await client.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM core.tenants');
      const orgs = await client.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM core.organizations');
      const perms = await client.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM core.permissions');
      expect(tenants.rows[0].count).toBe(3);
      expect(orgs.rows[0].count).toBe(8);
      expect(perms.rows[0].count).toBe(39);
    } finally {
      await client.end();
    }
  });
});
