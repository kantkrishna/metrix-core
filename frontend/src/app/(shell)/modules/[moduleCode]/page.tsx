// metrix-core/frontend/src/app/(shell)/modules/[moduleCode]/page.tsx
/*
Purpose: Renders the unified downstream module shell boundary or triggers the
Graceful Organization-Level Module Fallback when a module is not enabled on the
currently selected organization.

Context: Satisfies US-01.4 and US-01.5 without duplicating downstream Tax,
Payroll, or CA Practice internal business workflows.

Implementation Specs: Reads GET /me/modules and GET /organizations/tree to
display preserved context or one-click recovery into an entitled organization.
*/

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/session-context";
import {
  flattenEligibleOrganizations,
  hasEntitlementAdminAccess,
} from "@/features/shell/module-switcher-helpers";
import { OrganizationModuleFallback } from "@/features/shell/organization-module-fallback";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";
import { useThemePreference } from "@/providers/theme-provider";

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  platform_core: "Platform Core",
  tax_financial: "Tax & Financial Intelligence",
  payroll_hrms: "Payroll & HRMS",
  ca_practice: "CA Practice & Accounting",
};

export default function DownstreamModuleBoundaryPage(): React.ReactElement {
  const params = useParams<{ moduleCode: string }>();
  const router = useRouter();
  const { t, locale } = useTranslations();
  const { resolvedTheme } = useThemePreference();
  const { requestContext, activeOrganizationId, selectOrganization } =
    useSession();

  const moduleCode = params.moduleCode;
  const displayModuleName = MODULE_DISPLAY_NAMES[moduleCode] ?? moduleCode;

  const manifestQuery = useQuery({
    queryKey: ["me-modules", requestContext.tenantId, activeOrganizationId],
    queryFn: () =>
      coreApi.getAccessibleModules(
        { organizationId: activeOrganizationId, includeLockedAddOns: true },
        requestContext
      ),
  });

  const activeModule = manifestQuery.data?.modules.find(
    (m) => m.code === moduleCode
  );
  const needsFallback =
    Boolean(manifestQuery.data?.contextFallback?.fallbackApplied) ||
    (!manifestQuery.isLoading && !activeModule);

  const orgTreeQuery = useQuery({
    queryKey: ["org-tree-fallback", requestContext.tenantId],
    queryFn: () => coreApi.getOrganizationTree(requestContext),
    enabled: needsFallback,
  });

  if (manifestQuery.isLoading || (needsFallback && orgTreeQuery.isLoading)) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (needsFallback) {
    const allPerms =
      manifestQuery.data?.modules.flatMap((m) => m.effectivePermissions) ?? [];
    const eligible = flattenEligibleOrganizations(
      orgTreeQuery.data?.roots ?? [],
      moduleCode
    );
    return (
      <OrganizationModuleFallback
        moduleName={displayModuleName}
        currentOrganizationName={
          manifestQuery.data?.organizationName ?? t("shell.allTenantsContext")
        }
        eligibleOrganizations={eligible}
        canManageEntitlements={hasEntitlementAdminAccess(allPerms)}
        onSwitchOrganization={(orgId) => {
          selectOrganization(orgId);
        }}
        onManageEntitlements={() => router.push("/subscriptions")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-success bg-status-success-bg px-4 py-3 text-xs font-semibold text-status-success">
        <span>
          {t("shell.downstreamSynced", {
            orgName:
              manifestQuery.data?.organizationName ??
              t("shell.allTenantsContext"),
            theme: resolvedTheme,
            locale,
          })}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          {t("shell.returnToCore")}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{activeModule?.name ?? displayModuleName}</CardTitle>
          <StatusBadge tone="info">
            {t("shell.downstreamBoundaryBadge")}
          </StatusBadge>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {activeModule?.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
