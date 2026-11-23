// src/db/rls-context.service.ts
//
// Purpose: Manages PostgreSQL connection pool lifecycle, scoped RLS transactions, and runtime role security verification.
//
// Context: Audits current_user rolbypassrls and rolsuper flags on startup to alert immediately if a privileged role is misconfigured.
//
// Implementation Specs: NestJS @Injectable() service implementing OnModuleInit/OnModuleDestroy with runScoped() and verifyConnectivity().

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { createDbPool, withRlsContext, type PlatformCoreDb, type RlsSessionContext } from './index';

export interface DbConnectivityStatus {
  ok: boolean;
  currentRole: string;
  bypassRls: boolean;
  isSuperuser: boolean;
  serverVersion: string;
  enforcedRlsTables: number;
}

@Injectable()
export class RlsContextService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RlsContextService.name);
  private readonly pool: Pool;
  public readonly db: PlatformCoreDb;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const created = createDbPool(databaseUrl);
    this.pool = created.pool;
    this.db = created.db;
  }

  async onModuleInit(): Promise<void> {
    const status = await this.verifyConnectivity();
    if (status.isSuperuser || status.bypassRls) {
      this.logger.warn(
        `SECURITY WARNING: Runtime DB role "${status.currentRole}" has SUPERUSER or BYPASSRLS! Switch DATABASE_URL to metrix_app.`,
      );
    } else {
      this.logger.log(
        `Connected to PostgreSQL as "${status.currentRole}" (NOBYPASSRLS verified; ${status.enforcedRlsTables} FORCE RLS tables active).`,
      );
    }
  }

  async runScoped<T>(
    ctx: RlsSessionContext,
    work: (tx: Parameters<Parameters<PlatformCoreDb['transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return withRlsContext(this.db, ctx, work);
  }

  async verifyConnectivity(): Promise<DbConnectivityStatus> {
    const res = await this.pool.query<{
      current_role: string;
      rolbypassrls: boolean;
      rolsuper: boolean;
      server_version: string;
      rls_tables: number;
    }>(`
      SELECT
        current_user AS current_role,
        r.rolbypassrls,
        r.rolsuper,
        current_setting('server_version') AS server_version,
        (
          SELECT COUNT(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'core'
            AND c.relkind = 'r'
            AND c.relrowsecurity = true
            AND c.relforcerowsecurity = true
        ) AS rls_tables
      FROM pg_roles r
      WHERE r.rolname = current_user
    `);

    const row = res.rows[0];
    return {
      ok: true,
      currentRole: row.current_role,
      bypassRls: row.rolbypassrls,
      isSuperuser: row.rolsuper,
      serverVersion: row.server_version,
      enforcedRlsTables: row.rls_tables,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
