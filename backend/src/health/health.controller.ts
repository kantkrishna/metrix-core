// backend/src/health/health.controller.ts
//
// Purpose: Exposes the public database connectivity and RLS posture health probe endpoint.
//
// Context: Allows deployment monitors and operators to verify live PostgreSQL connectivity, NOBYPASSRLS enforcement, and active FORCE RLS table counts.
//
// Implementation Specs: NestJS @Controller("health") handling GET /api/v1/core/health/db with RFC 9457 503 failure payloads.

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { RlsContextService } from '../db/rls-context.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly rlsService: RlsContextService) {}

  @Get('db')
  @RequirePermission('public')
  async checkDatabase() {
    try {
      const dbStatus = await this.rlsService.verifyConnectivity();
      return {
        service: 'metrix-platform-core-service',
        status: dbStatus.ok && !dbStatus.bypassRls && !dbStatus.isSuperuser ? 'OPERATIONAL' : 'DEGRADED',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new ServiceUnavailableException({
        type: 'https://metrix-erp.cloud/errors/database-unavailable',
        title: 'Database Connectivity Failed',
        status: 503,
        detail: err instanceof Error ? err.message : 'Unable to reach PostgreSQL',
      });
    }
  }
}
