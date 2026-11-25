// backend/src/common/guards/oidc-session.guard.ts
//
// Purpose: Validates Bearer access tokens against active core.user_sessions
// rows and resolves authenticated user, tenant, organization, and Tenant Owner
// RLS flags for every protected Epic 1 request.
//
// Context: Enforces NFR-SEC-01 and NFR-ISO-01 across all protected Epic 1
// endpoints and populates isTenantOwner so PostgreSQL FORCE RLS grants Tenant
// Admins and CA Partners visibility across their tenant's organizations.
//
// Implementation Specs: Verifies core.user_sessions.oidcSessionId and active
// TENANT_ADMIN membership in core.organization_memberships for the resolved
// tenantId.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Request } from "express";
import {
  organizationMemberships,
  userSessions,
  users,
} from "../../db/schema/platform-core";
import { runWithRls } from "../db-runtime";

export interface AuthenticatedUserContext {
  userId: string;
  email: string;
  fullName: string;
  isPlatformSuperAdmin: boolean;
  isTenantOwner: boolean;
  tenantId: string | null;
  organizationId: string | null;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  authUser: AuthenticatedUserContext;
}

@Injectable()
export class OidcSessionGuard implements CanActivate {
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer OIDC access token.");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer OIDC access token.");
    }

    const tenantHeader =
      typeof req.headers["x-tenant-id"] === "string"
        ? req.headers["x-tenant-id"]
        : null;
    const orgHeader =
      typeof req.headers["x-organization-id"] === "string"
        ? req.headers["x-organization-id"]
        : null;

    const record = await runWithRls(
      { isSuperAdmin: true, userId: null, tenantId: null },
      async (tx) => {
        const rows = await tx
          .select({
            sessionId: userSessions.id,
            userId: users.id,
            email: users.email,
            fullName: users.fullName,
            status: users.status,
            isPlatformSuperAdmin: users.isPlatformSuperAdmin,
            primaryTenantId: users.primaryTenantId,
            sessionTenantId: userSessions.tenantId,
          })
          .from(userSessions)
          .innerJoin(users, eq(userSessions.userId, users.id))
          .where(
            and(
              eq(userSessions.oidcSessionId, token),
              isNull(userSessions.revokedAt),
              gt(userSessions.expiresAt, new Date())
            )
          )
          .limit(1);

        const found = rows[0] ?? null;
        if (!found) return null;

        const resolvedTenantId =
          tenantHeader ?? found.sessionTenantId ?? found.primaryTenantId;

        let isTenantOwner = found.isPlatformSuperAdmin;
        if (!isTenantOwner && resolvedTenantId) {
          const ownerRows = await tx
            .select({ id: organizationMemberships.id })
            .from(organizationMemberships)
            .where(
              and(
                eq(organizationMemberships.userId, found.userId),
                eq(organizationMemberships.tenantId, resolvedTenantId),
                eq(organizationMemberships.status, "ACTIVE"),
                eq(organizationMemberships.membershipType, "TENANT_ADMIN")
              )
            )
            .limit(1);
          isTenantOwner = ownerRows.length > 0;
        }

        return {
          ...found,
          resolvedTenantId,
          isTenantOwner,
        };
      }
    );

    if (!record || record.status !== "ACTIVE") {
      throw new UnauthorizedException(
        "Session is invalid, expired, or suspended."
      );
    }

    req.authUser = {
      userId: record.userId,
      email: record.email,
      fullName: record.fullName,
      isPlatformSuperAdmin: record.isPlatformSuperAdmin,
      isTenantOwner: record.isTenantOwner,
      tenantId: record.resolvedTenantId,
      organizationId: orgHeader,
      sessionId: record.sessionId,
    };

    return true;
  }
}
