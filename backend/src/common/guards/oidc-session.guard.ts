// backend/src/common/guards/oidc-session.guard.ts
//
// Purpose: Validates Bearer access tokens against active core.user_sessions
// rows and attaches authenticated user and RLS header context to requests.
//
// Context: Enforces NFR-SEC-01 and NFR-ISO-01 across all protected Epic 1
// endpoints without storing or checking passwords in Platform Core.
//
// Implementation Specs: Reads Authorization Bearer token, verifies active
// non-revoked session via core.user_sessions.oidcSessionId, and populates
// req.authUser.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Request } from "express";
import { userSessions, users } from "../../db/schema/platform-core";
import { runWithRls } from "../db-runtime";

export interface AuthenticatedUserContext {
  userId: string;
  email: string;
  fullName: string;
  isPlatformSuperAdmin: boolean;
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
        return rows[0] ?? null;
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
      tenantId:
        tenantHeader ?? record.sessionTenantId ?? record.primaryTenantId,
      organizationId: orgHeader,
      sessionId: record.sessionId,
    };

    return true;
  }
}
