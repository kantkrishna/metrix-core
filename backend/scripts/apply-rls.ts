// backend/scripts/apply-rls.ts
//
// Purpose: Executes the PostgreSQL FORCE RLS, trigger, operational view, and catalog comment
// migration (0001_platform_core_rls_and_views.sql) cleanly across Windows, macOS, and Linux.
//
// Context: Invoked by npm run db:migrate:rls during npm run db:bootstrap using the schema-owner
// DATABASE_ADMIN_URL connection without requiring a local psql binary.
//
// Implementation Specs: Connects via pg.Client, runs the idempotent SQL migration, and prints
// a live verification summary of FORCE RLS tables and documented PostgreSQL catalog objects.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

async function applyRlsMigration() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) {
    throw new Error('DATABASE_ADMIN_URL must be set in .env (metrix_owner role) to apply RLS migration.');
  }

  const sqlPath = resolve(process.cwd(), 'drizzle/migrations/0001_platform_core_rls_and_views.sql');
  const migrationSql = readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: adminUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    console.log(`[db:migrate:rls] Applying ${sqlPath}...`);
    await client.query(migrationSql);

    const summary = await client.query<{
      rls_tables: number;
      missing_rel_comments: number;
      missing_col_comments: number;
    }>(`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'core' AND c.relkind = 'r'
            AND c.relrowsecurity = true AND c.relforcerowsecurity = true
        ) AS rls_tables,
        (
          SELECT COUNT(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'core' AND c.relkind IN ('r', 'v')
            AND obj_description(c.oid, 'pg_class') IS NULL
        ) AS missing_rel_comments,
        (
          SELECT COUNT(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = c.oid
          WHERE n.nspname = 'core' AND c.relkind IN ('r', 'v')
            AND a.attnum > 0 AND NOT a.attisdropped
            AND col_description(c.oid, a.attnum) IS NULL
        ) AS missing_col_comments
    `);

    const row = summary.rows[0];
    console.log(
      `✓ Applied ${row.rls_tables} FORCE RLS tables, audit immutability trigger, views & catalog comments (missing table/view comments: ${row.missing_rel_comments}, missing column comments: ${row.missing_col_comments}).`,
    );
  } finally {
    await client.end();
  }
}

applyRlsMigration().catch((err) => {
  console.error('Failed to apply RLS & catalog comment migration:', err);
  process.exit(1);
});
