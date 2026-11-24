// backend/src/common/guards/rls-tenant-context.guard.ts
//
// Purpose: Validates authenticated principal context, tenant/org UUID headers, and effective RBAC permission grants.
//
// Context: Queries core.v_effective_user_org_permissions inside a scoped RLS transaction so both role permissions and org module entitlements are enforced.
//
// Implementation Specs: NestJS CanActivate guard injecting Reflector and RlsContextService, emitting RFC 9457 401/403 exceptions.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';
import { RlsContextService } from '../../db/rls-context.service';
import type { RlsSessionContext } from '../../db/index';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';

export interface AuthenticatedPrincipal {
  userId: string;
  oidcSub: string;
  isPlatformSuperAdmin: boolean;
  tenantOwnerIds: string[];
}

export interface RequestWithRls extends Request {
  principal?: AuthenticatedPrincipal;
  rlsContext?: RlsSessionContext;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class RlsTenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rlsService: RlsContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithRls>();
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermission === 'public') return true;

    const principal = req.principal;
    if (!principal?.userId) {
      throw new UnauthorizedException({
        type: 'https://metrix-erp.cloud/errors/unauthorized',
        title: 'Authentication Required',
        detail: 'A valid managed OIDC Bearer token or scoped API Key is required.',
      });
    }

    const headerTenantId = (req.headers['x-tenant-id'] as string | undefined) ?? null;
    const headerOrgId = (req.headers['x-organization-id'] as string | undefined) ?? null;

    if (headerTenantId && !UUID_REGEX.test(headerTenantId)) {
      throw new ForbiddenException({
        type: 'https://metrix-erp.cloud/errors/invalid-tenant-context',
        title: 'Invalid Tenant Context Header',
        detail: 'X-Tenant-Id must be a valid UUID.',
      });
    }

    const isTenantOwner = Boolean(headerTenantId && principal.tenantOwnerIds.includes(headerTenantId));
    const rlsCtx: RlsSessionContext = {
      userId: principal.userId,
      tenantId: headerTenantId,
      isPlatformSuperAdmin: principal.isPlatformSuperAdmin,
      isTenantOwner,
    };
    req.rlsContext = rlsCtx;

    if (!requiredPermission || requiredPermission === 'authenticated' || principal.isPlatformSuperAdmin) {
      return true;
    }

    const allowed = await this.rlsService.runScoped(rlsCtx, async (tx) => {
      const result = await tx.execute<{ granted: boolean }>(sql`
        SELECT EXISTS (
          SELECT 1
          FROM core.v_effective_user_org_permissions ep
          WHERE ep.user_id = ${principal.userId}::uuid
            AND ep.permission_code = ${requiredPermission}
            AND ep.is_entitlement_active = true
            AND (${headerTenantId}::uuid IS NULL OR ep.tenant_id = ${headerTenantId}::uuid)
            AND (${headerOrgId}::uuid IS NULL OR ep.organization_id = ${headerOrgId}::uuid)
        ) AS granted
      `);
      return Boolean(result.rows[0]?.granted);
    });

    if (!allowed) {
      throw new ForbiddenException({
        type: 'https://metrix-erp.cloud/errors/insufficient-permission',
        title: 'Access Restricted',
        detail: `You require the "${requiredPermission}" permission to perform this operation.`,
        missingPermission: requiredPermission,
      });
    }

    return true;
  }
}
