// src/db/index.ts
//
// Purpose: Initializes the pooled PostgreSQL Drizzle client and provides transaction-scoped RLS context execution.
//
// Context: Binds tenant, user, super-admin, and owner flags via set_config(..., true) so pooled connections never leak tenant context across requests.
//
// Implementation Specs: node-postgres pg.Pool + drizzle-orm/node-postgres exporting createDbPool() and withRlsContext().

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export type PlatformCoreDb = NodePgDatabase<typeof schema>;

export interface RlsSessionContext {
  userId: string;
  tenantId?: string | null;
  isPlatformSuperAdmin?: boolean;
  isTenantOwner?: boolean;
}

export function createDbPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });
  return { pool, db };
}

export async function withRlsContext<T>(
  db: PlatformCoreDb,
  ctx: RlsSessionContext,
  callback: (tx: Parameters<Parameters<PlatformCoreDb['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT
        set_config('app.is_platform_super_admin', ${String(Boolean(ctx.isPlatformSuperAdmin))}, true),
        set_config('app.current_tenant_id', ${ctx.tenantId ?? ''}, true),
        set_config('app.current_user_id', ${ctx.userId}, true),
        set_config('app.is_tenant_owner', ${String(Boolean(ctx.isTenantOwner))}, true)`,
    );
    return callback(tx);
  });
}
