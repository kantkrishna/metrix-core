// backend/src/common/db-runtime.ts
//
// Purpose: Provides a lazily initialized Drizzle ORM runtime pool and
// transaction-scoped PostgreSQL FORCE RLS helper (runWithRls) for Epic 1.
//
// Context: Lazily reads process.env.DATABASE_URL after NestJS ConfigModule
// loads .env and sets PostgreSQL RLS session variables via SET LOCAL.
//
// Implementation Specs: Uses pg Pool + drizzle-orm/node-postgres with full
// Platform Core schema typing.

import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema/platform-core";

export type RuntimeDb = NodePgDatabase<typeof schema>;
export type RlsTx = Parameters<Parameters<RuntimeDb["transaction"]>[0]>[0];

let cachedDb: RuntimeDb | null = null;

function getRuntimeDb(): RuntimeDb {
  if (!cachedDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Verify metrix-core/backend/.env."
      );
    }
    const pool = new Pool({ connectionString });
    cachedDb = drizzle(pool, { schema });
  }
  return cachedDb;
}

export interface RlsSessionContext {
  isSuperAdmin?: boolean;
  isTenantOwner?: boolean;
  userId?: string | null;
  tenantId?: string | null;
}

export async function runWithRls<T>(
  ctx: RlsSessionContext,
  callback: (tx: RlsTx) => Promise<T>
): Promise<T> {
  return getRuntimeDb().transaction(async (tx) => {
    const isSuper = ctx.isSuperAdmin ? "true" : "false";
    const isOwner = ctx.isTenantOwner ? "true" : "false";
    const tenantVal = ctx.tenantId ?? "";
    const userVal = ctx.userId ?? "";

    await tx.execute(
      sql`SELECT set_config('app.is_platform_super_admin', ${isSuper}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.is_tenant_owner', ${isOwner}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantVal}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userVal}, true)`
    );

    return callback(tx);
  });
}