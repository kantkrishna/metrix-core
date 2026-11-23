// scripts/apply-rls.ts
//
// Purpose: Executes the PostgreSQL RLS, trigger, and views SQL migration directly through the pg driver.
//
// Context: Removes any dependency on a locally installed psql binary so db:migrate:rls runs identically on Windows PowerShell, macOS, and Linux CI.
//
// Implementation Specs: TypeScript/tsx CLI connecting via DATABASE_ADMIN_URL (pg.Client) to execute drizzle/migrations/0001_platform_core_rls_and_views.sql.

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
    console.log(`[Platform Core RLS] Applying ${sqlPath}...`);
    await client.query(migrationSql);
    console.log('✓ Applied 21 FORCE RLS policies, audit immutability trigger, views & catalog comments.');
  } finally {
    await client.end();
  }
}

applyRlsMigration().catch((err) => {
  console.error('Failed to apply RLS migration:', err);
  process.exit(1);
});
