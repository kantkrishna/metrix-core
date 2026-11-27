// test/integration/pg-test-helper.ts
//
// Purpose: Spins up an ephemeral PostgreSQL 16 container initialized with dual roles, Drizzle schema, FORCE RLS migration, and seed data.
//
// Context: Provides realistic, isolated database environments for integration tests without mutating local developer Docker volumes.
//
// Implementation Specs: @testcontainers/postgresql 12 harness running 00-init-roles.sql, drizzle-kit push, 0001_platform_core_rls_and_views.sql, and runSeed().

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { runSeed } from '../../src/db/seed';

export interface ProvisionedTestDb {
  container: StartedPostgreSqlContainer;
  ownerUrl: string;
  appUrl: string;
  cleanup: () => Promise<void>;
}

/**
 * Provisions an isolated PostgreSQL 16 container with dual roles (metrix_owner & metrix_app NOBYPASSRLS),
 * pushes the Drizzle schema, applies 0001_platform_core_rls_and_views.sql, and runs idempotent seed data.
 */
export async function startProvisionedPlatformCoreDb(): Promise<ProvisionedTestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('metrix_platform_core')
    .withUsername('postgres')
    .withPassword('postgres_test_pwd')
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const dbName = container.getDatabase();

  const rootClient = new Client({ connectionString: container.getConnectionUri() });
  await rootClient.connect();
  try {
    const initSql = readFileSync(resolve('docker/postgres-init/00-init-roles.sql'), 'utf8');
    await rootClient.query(initSql);
  } finally {
    await rootClient.end();
  }

  const ownerUrl = `postgresql://metrix_owner:metrix_owner_dev_pwd@${host}:${port}/${dbName}`;
  const appUrl = `postgresql://metrix_app:metrix_app_dev_pwd@${host}:${port}/${dbName}`;

  const drizzlePkgPath = resolve('node_modules/drizzle-kit/package.json');
  const drizzlePkg = JSON.parse(readFileSync(drizzlePkgPath, 'utf8')) as {
    bin?: string | Record<string, string>;
  };
  const drizzleBinRel =
    typeof drizzlePkg.bin === 'string'
      ? drizzlePkg.bin
      : drizzlePkg.bin?.['drizzle-kit'];
  if (!drizzleBinRel) {
    throw new Error('Could not resolve drizzle-kit binary from node_modules/drizzle-kit/package.json');
  }
  const drizzleBin = resolve('node_modules/drizzle-kit', drizzleBinRel);

  execFileSync(process.execPath, [drizzleBin, 'push', '--force'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_ADMIN_URL: ownerUrl, DATABASE_URL: appUrl },
    stdio: 'pipe',
  });

  const ownerClient = new Client({ connectionString: ownerUrl });
  await ownerClient.connect();
  try {
    const rlsSql = readFileSync(resolve('drizzle/migrations/0001_platform_core_rls_and_views.sql'), 'utf8');
    await ownerClient.query(rlsSql);
  } finally {
    await ownerClient.end();
  }

  await runSeed(appUrl);

  return {
    container,
    ownerUrl,
    appUrl,
    cleanup: async () => {
      await container.stop();
    },
  };
}
