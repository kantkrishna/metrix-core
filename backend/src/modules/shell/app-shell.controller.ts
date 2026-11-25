// backend/src/modules/shell/app-shell.controller.ts
//
// Purpose: Exposes /me/preferences, /me/modules, /health/services, /search,
// /dashboard/summary, and /organizations/tree for Epic 1 (US-01.2 - US-01.5).
//
// Context: Evaluates all queries inside transaction-scoped PostgreSQL FORCE RLS
// (runWithRls) with isTenantOwner propagated so Tenant Admins / CA Partners see
// all their tenant's organizations while scoped staff see only assigned orgs.
//
// Implementation Specs: Drizzle ORM queries aligned 1:1 with
// openapi-platform-core-v1.yaml; sets private, no-store + Vary on /me/modules.

import crypto from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { Response } from "express";
import { runWithRls } from "../../common/db-runtime";
import {
  OidcSessionGuard,
  type AuthenticatedRequest,
} from "../../common/guards/oidc-session.guard";
import {
  auditLogs,
  notificationDeliveries,
  organizationModuleEntitlements,
  organizations,
  saasModules,
  tenantModuleSubscriptions,
  tenants,
  users,
} from "../../db/schema/platform-core";

const MODULE_META: Record<string, { baseUrl: string; themeKey: string }> = {
  platform_core: { baseUrl: "/dashboard", themeKey: "core" },
  tax_financial: { baseUrl: "/modules/tax_financial", themeKey: "tax" },
  payroll_hrms: { baseUrl: "/modules/payroll_hrms", themeKey: "payroll" },
  ca_practice: { baseUrl: "/modules/ca_practice", themeKey: "practice" },
};

@Controller()
@UseGuards(OidcSessionGuard)
export class AppShellController {
  @Get("me/preferences")
  public async getPreferences(@Req() req: AuthenticatedRequest) {
    return this.readUserPreferences(req.authUser.userId);
  }

  @Patch("me/preferences")
  public async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      uiNavPinned?: boolean;
      uiThemeMode?: "LIGHT" | "DARK" | "SYSTEM";
      lastWorkspaceTenantId?: string | null;
    }
  ) {
    await runWithRls(
      { isSuperAdmin: true, userId: req.authUser.userId, tenantId: null },
      async (tx) => {
        await tx
          .update(users)
          .set({
            ...(body.uiNavPinned !== undefined
              ? { uiNavPinned: body.uiNavPinned }
              : {}),
            ...(body.uiThemeMode !== undefined
              ? { uiThemeMode: body.uiThemeMode }
              : {}),
            ...(body.lastWorkspaceTenantId !== undefined
              ? { lastWorkspaceTenantId: body.lastWorkspaceTenantId }
              : {}),
            updatedBy: req.authUser.userId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, req.authUser.userId));
      }
    );
    return this.readUserPreferences(req.authUser.userId);
  }

  @Get("health/services")
  public async getServicesHealth() {
    return runWithRls(
      { isSuperAdmin: true, userId: null, tenantId: null },
      async (tx) => {
        const list = await tx.select().from(saasModules);
        const operationalCount = list.filter(
          (m) => m.healthStatus === "OPERATIONAL"
        ).length;
        return {
          operationalCount,
          totalCount: list.length,
          services: list.map((m) => ({
            code: m.code,
            displayName: m.displayName,
            description: m.description,
            apiVersion: m.apiVersion,
            healthStatus: m.healthStatus,
            includedFeatures: m.includedFeatures ?? [],
            isCoreService: m.isCoreService,
            isActive: m.isActive,
          })),
        };
      }
    );
  }

  @Get("me/modules")
  public async getAccessibleModules(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Query("organizationId") orgQuery?: string,
    @Query("includeLockedAddOns") includeLocked?: string
  ) {
    const targetOrgId = orgQuery || req.authUser.organizationId;
    const prefs = await this.readUserPreferences(req.authUser.userId);
    const isAdmin =
      req.authUser.isPlatformSuperAdmin || req.authUser.isTenantOwner;

    const manifest = await runWithRls(
      {
        isSuperAdmin: req.authUser.isPlatformSuperAdmin,
        isTenantOwner: req.authUser.isTenantOwner,
        userId: req.authUser.userId,
        tenantId: req.authUser.tenantId,
      },
      async (tx) => {
        const allModules = await tx.select().from(saasModules);
        const visibleOrgs = req.authUser.tenantId
          ? await tx
              .select()
              .from(organizations)
              .where(eq(organizations.tenantId, req.authUser.tenantId))
          : [];

        const resolvedOrg =
          visibleOrgs.find((o) => o.id === targetOrgId) ??
          visibleOrgs[0] ??
          null;

        const tenantSubs = req.authUser.tenantId
          ? await tx
              .select()
              .from(tenantModuleSubscriptions)
              .where(
                eq(tenantModuleSubscriptions.tenantId, req.authUser.tenantId)
              )
          : [];

        const orgEnts = resolvedOrg
          ? await tx
              .select()
              .from(organizationModuleEntitlements)
              .where(
                eq(organizationModuleEntitlements.organizationId, resolvedOrg.id)
              )
          : [];

        const subMap = new Map(tenantSubs.map((s) => [s.moduleCode, s]));
        const entMap = new Map(orgEnts.map((e) => [e.moduleCode, e]));

        const modules = allModules
          .filter((m) => {
            if (m.isCoreService) return true;
            const sub = subMap.get(m.code);
            const ent = entMap.get(m.code);
            const subOk = sub?.status === "ACTIVE" || sub?.status === "TRIAL";
            return subOk && (ent ? ent.isEnabled : false);
          })
          .map((m) => ({
            code: m.code,
            name: m.displayName,
            description: m.description,
            baseUrl: MODULE_META[m.code]?.baseUrl ?? `/modules/${m.code}`,
            themeKey: MODULE_META[m.code]?.themeKey ?? "core",
            apiVersion: m.apiVersion,
            status: (subMap.get(m.code)?.status ?? "ACTIVE") as
              | "ACTIVE"
              | "TRIAL"
              | "NOT_SUBSCRIBED"
              | "UPGRADE_PENDING"
              | "SUSPENDED",
            healthStatus: m.healthStatus,
            isCoreService: m.isCoreService,
            permittedRoutes: m.isCoreService
              ? ["dashboard", "tenants", "organizations", "subscriptions"]
              : ["overview"],
            effectivePermissions: isAdmin
              ? ["dashboard:view", "subscriptions:manage", "entitlements:edit"]
              : ["dashboard:view"],
            featureFlags: {},
          }));

        const wantLocked = includeLocked === "true";
        const lockedAddOns =
          wantLocked && isAdmin
            ? allModules
                .filter((m) => {
                  if (m.isCoreService) return false;
                  const sub = subMap.get(m.code);
                  return (
                    !sub ||
                    sub.status === "NOT_SUBSCRIBED" ||
                    sub.status === "SUSPENDED"
                  );
                })
                .map((m) => ({
                  code: m.code,
                  name: m.displayName,
                  description: m.description,
                  status: (subMap.get(m.code)?.status === "SUSPENDED"
                    ? "SUSPENDED"
                    : "NOT_SUBSCRIBED") as "NOT_SUBSCRIBED" | "SUSPENDED",
                  manageSubscriptionUrl: "/subscriptions",
                  upgradeRequired: true,
                }))
            : [];

        return {
          tenantId: req.authUser.tenantId,
          organizationId: resolvedOrg?.id ?? null,
          organizationCode: resolvedOrg?.orgCode ?? null,
          organizationName: resolvedOrg?.legalName ?? null,
          contextFallback: null,
          uiPreferences: prefs,
          modules,
          lockedAddOns,
          evaluatedAt: new Date().toISOString(),
        };
      }
    );

    const etag = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          orgId: manifest.organizationId,
          modules: manifest.modules,
          lockedAddOns: manifest.lockedAddOns,
        })
      )
      .digest("hex")
      .slice(0, 16);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Vary",
      "Origin, Authorization, X-Tenant-Id, X-Organization-Id, Accept-Language"
    );
    res.setHeader("ETag", `"${etag}"`);
    return manifest;
  }

  @Get("dashboard/summary")
  public async getDashboardSummary(@Req() req: AuthenticatedRequest) {
    return runWithRls(
      {
        isSuperAdmin: req.authUser.isPlatformSuperAdmin,
        isTenantOwner: req.authUser.isTenantOwner,
        userId: req.authUser.userId,
        tenantId: req.authUser.tenantId,
      },
      async (tx) => {
        const tenantRows = await tx.select().from(tenants).limit(20);
        const orgRows = await tx
          .select({ id: organizations.id })
          .from(organizations);
        const userRows = await tx
          .select({ id: users.id, mfa: users.mfaEnrolled })
          .from(users);
        const entRows = await tx
          .select({ id: organizationModuleEntitlements.id })
          .from(organizationModuleEntitlements)
          .where(eq(organizationModuleEntitlements.isEnabled, true));
        const recentAudits = await tx
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(5);

        const mfaCount = userRows.filter((u) => u.mfa).length;
        const mfaEnrolledPct =
          userRows.length > 0
            ? Math.round((mfaCount / userRows.length) * 1000) / 10
            : 0;

        return {
          kpis: {
            activeTenants: tenantRows.filter((t) => t.status === "ACTIVE")
              .length,
            provisionedOrgs: orgRows.length,
            activeUsers: userRows.length,
            mfaEnrolledPct,
            activeModuleEntitlements: entRows.length,
          },
          recentTenants: tenantRows.map((t) => ({
            id: t.id,
            tenantCode: t.tenantCode,
            legalName: t.legalName,
            slug: t.slug,
            customerType: t.customerType,
            status: t.status,
          })),
          governanceAlerts: [],
          recentHighRiskAudits: recentAudits.map((a) => ({
            id: a.id,
            eventCode: a.eventCode,
            tenantId: a.tenantId,
            organizationId: a.organizationId,
            actorNameSnapshot: a.actorNameSnapshot,
            actorRoleSnapshot: a.actorRoleSnapshot,
            serviceSource: a.serviceSource,
            actionCategory: a.actionCategory,
            eventAction: a.eventAction,
            targetResourceType: a.targetResourceType,
            targetResourceId: a.targetResourceId,
            outcome: a.outcome,
            httpStatusCode: a.httpStatusCode,
            otelTraceId: a.otelTraceId,
            ipAddress: a.ipAddress,
            retentionUntilOn: a.retentionUntilOn,
            createdBy: a.createdBy,
            createdAt: a.createdAt.toISOString(),
          })),
        };
      }
    );
  }

  @Get("search")
  public async globalSearch(
    @Req() req: AuthenticatedRequest,
    @Query("q") q = "",
    @Query("limit") limitRaw = "10"
  ) {
    const limit = Math.min(Math.max(Number(limitRaw) || 10, 1), 25);
    const pattern = `%${q.trim()}%`;

    return runWithRls(
      {
        isSuperAdmin: req.authUser.isPlatformSuperAdmin,
        isTenantOwner: req.authUser.isTenantOwner,
        userId: req.authUser.userId,
        tenantId: req.authUser.tenantId,
      },
      async (tx) => {
        const matchedTenants = await tx
          .select()
          .from(tenants)
          .where(
            or(ilike(tenants.legalName, pattern), ilike(tenants.slug, pattern))
          )
          .limit(limit);

        return {
          query: q,
          results: matchedTenants.map((t) => ({
            entityType: "TENANT" as const,
            id: t.id,
            title: t.legalName,
            subtitle: `${t.tenantCode} · ${t.customerType}`,
            href: `/tenants/${t.id}`,
          })),
        };
      }
    );
  }

  @Get("organizations/tree")
  public async getOrganizationTree(@Req() req: AuthenticatedRequest) {
    const tenantId = req.authUser.tenantId;
    return runWithRls(
      {
        isSuperAdmin: req.authUser.isPlatformSuperAdmin,
        isTenantOwner: req.authUser.isTenantOwner,
        userId: req.authUser.userId,
        tenantId,
      },
      async (tx) => {
        const orgs = tenantId
          ? await tx
              .select()
              .from(organizations)
              .where(eq(organizations.tenantId, tenantId))
          : await tx.select().from(organizations);

        const ents = tenantId
          ? await tx
              .select()
              .from(organizationModuleEntitlements)
              .where(
                and(
                  eq(organizationModuleEntitlements.tenantId, tenantId),
                  eq(organizationModuleEntitlements.isEnabled, true)
                )
              )
          : await tx
              .select()
              .from(organizationModuleEntitlements)
              .where(eq(organizationModuleEntitlements.isEnabled, true));

        const modsByOrg = new Map<string, string[]>();
        for (const e of ents) {
          const list = modsByOrg.get(e.organizationId) ?? [];
          list.push(e.moduleCode);
          modsByOrg.set(e.organizationId, list);
        }

        const roots = orgs.map((o) => ({
          organization: {
            id: o.id,
            tenantId: o.tenantId,
            parentOrgId: o.parentOrgId,
            orgCode: o.orgCode,
            legalName: o.legalName,
            orgType: o.orgType,
            status: o.status,
            enabledModules: modsByOrg.get(o.id) ?? [],
          },
          children: [],
        }));

        return {
          tenantId: tenantId ?? orgs[0]?.tenantId ?? null,
          totalVisibleOrgs: orgs.length,
          roots,
        };
      }
    );
  }

  private async readUserPreferences(userId: string) {
    return runWithRls(
      { isSuperAdmin: true, userId, tenantId: null },
      async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const unread = await tx
          .select({ id: notificationDeliveries.id })
          .from(notificationDeliveries)
          .where(
            and(
              eq(notificationDeliveries.recipientUserId, userId),
              eq(notificationDeliveries.isRead, false)
            )
          );
        return {
          userId,
          uiNavPinned: user?.uiNavPinned ?? false,
          uiThemeMode: user?.uiThemeMode ?? "SYSTEM",
          lastWorkspaceTenantId: user?.lastWorkspaceTenantId ?? null,
          unreadNotificationCount: unread.length,
        };
      }
    );
  }
}
