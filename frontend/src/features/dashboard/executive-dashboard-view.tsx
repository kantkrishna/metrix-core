// metrix-core/frontend/src/features/dashboard/executive-dashboard-view.tsx
/*
Purpose: Renders the role-scoped Platform Core Executive Health Dashboard
including 4 KPI cards, filterable tenant activity table, governance alert feed,
and compact 5-row high-risk audit strip.

Context: Satisfies US-01.2 AC 1 through AC 5 and FR-CORE-003 strictly from
GET /api/v1/core/dashboard/summary without client-side aggregation logic.

Implementation Specs: TanStack Query with matching Skeleton loading states and
inline retryable error handling.
*/

"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CustomerType, TenantStatus } from "@/contracts/enums";
import { ApiProblemError } from "@/contracts/problem-details";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";
import { formatUtcTimestamp } from "@/lib/formatters";

function statusTone(
  status: TenantStatus
): "success" | "info" | "destructive" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "TRIAL") return "info";
  if (status === "SUSPENDED") return "destructive";
  return "neutral";
}

export function ExecutiveDashboardView(): React.ReactElement {
  const { t, locale } = useTranslations();
  const { requestContext } = useSession();
  const [typeFilter, setTypeFilter] = useState<CustomerType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "ALL">("ALL");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary", requestContext.tenantId],
    queryFn: () => coreApi.getDashboardSummary(30, requestContext),
  });

  const filteredTenants = useMemo(() => {
    const rows = dashboardQuery.data?.recentTenants ?? [];
    return rows.filter((row) => {
      if (typeFilter !== "ALL" && row.customerType !== typeFilter) return false;
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      return true;
    });
  }, [dashboardQuery.data?.recentTenants, statusFilter, typeFilter]);

  const formatNum = (val: number) =>
    new Intl.NumberFormat(locale).format(val);

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <Skeleton key={idx} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    const detail =
      dashboardQuery.error instanceof ApiProblemError
        ? dashboardQuery.error.message
        : t("errors.unexpected");
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-destructive">
            {detail}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void dashboardQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { kpis, governanceAlerts, recentHighRiskAudits } = dashboardQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <span className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpiActiveTenants")}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNum(kpis.activeTenants)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpiProvisionedOrgs")}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNum(kpis.provisionedOrgs)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpiActiveUsers")}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNum(kpis.activeUsers)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.kpiMfaSubtitle", { pct: kpis.mfaEnrolledPct })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-xs font-medium text-muted-foreground">
              {t("dashboard.kpiModuleEntitlements")}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatNum(kpis.activeModuleEntitlements)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("dashboard.recentTenantsTitle")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={t("a11y.filterCustomerType")}
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as CustomerType | "ALL")
                }
                className="h-8 rounded-md border border-input bg-select px-2 text-xs text-foreground"
              >
                <option value="ALL">{t("dashboard.filterAllTypes")}</option>
                <option value="INDIVIDUAL_SMB">
                  {t("dashboard.typeSmb")}
                </option>
                <option value="ENTERPRISE">
                  {t("dashboard.typeEnterprise")}
                </option>
                <option value="CA_FIRM">{t("dashboard.typeCaFirm")}</option>
              </select>

              <select
                aria-label={t("a11y.filterStatus")}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TenantStatus | "ALL")
                }
                className="h-8 rounded-md border border-input bg-select px-2 text-xs text-foreground"
              >
                <option value="ALL">{t("dashboard.filterAllStatuses")}</option>
                <option value="ACTIVE">{t("dashboard.statusActive")}</option>
                <option value="TRIAL">{t("dashboard.statusTrial")}</option>
                <option value="SUSPENDED">
                  {t("dashboard.statusSuspended")}
                </option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            {filteredTenants.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("dashboard.noMatchingTenants")}
              </p>
            ) : (
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-table-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-start">
                      {t("dashboard.colTenant")}
                    </th>
                    <th className="py-2 text-start">
                      {t("dashboard.colType")}
                    </th>
                    <th className="py-2 text-start">
                      {t("dashboard.colSeats")}
                    </th>
                    <th className="py-2 text-start">
                      {t("dashboard.colStatus")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-table-border last:border-0"
                    >
                      <td className="py-2.5 font-semibold text-foreground">
                        {tenant.legalName}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {tenant.customerType}
                      </td>
                      <td className="py-2.5 font-mono">
                        {tenant.quota
                          ? `${tenant.quota.activeSeatsUsed} / ${tenant.quota.seatLimit}`
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge tone={statusTone(tenant.status)}>
                          {tenant.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("dashboard.alertsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {governanceAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("dashboard.alertsEmpty")}
              </p>
            ) : (
              governanceAlerts.map((alert) => (
                <div
                  key={`${alert.severity}-${alert.title}`}
                  className="rounded-md border border-border bg-background-1 p-3"
                >
                  <StatusBadge
                    tone={
                      alert.severity === "CRITICAL"
                        ? "destructive"
                        : alert.severity === "WARNING"
                          ? "warning"
                          : "info"
                    }
                  >
                    {alert.title}
                  </StatusBadge>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {alert.detail}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.auditsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recentHighRiskAudits.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("dashboard.auditsEmpty")}
            </p>
          ) : (
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-table-border text-[11px] uppercase text-muted-foreground">
                  <th className="py-2 text-start">
                    {t("dashboard.colAction")}
                  </th>
                  <th className="py-2 text-start">
                    {t("dashboard.colActor")}
                  </th>
                  <th className="py-2 text-start">
                    {t("dashboard.colService")}
                  </th>
                  <th className="py-2 text-start">
                    {t("dashboard.colOutcome")}
                  </th>
                  <th className="py-2 text-start">
                    {t("dashboard.colTimestamp")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentHighRiskAudits.slice(0, 5).map((evt) => (
                  <tr
                    key={evt.id}
                    className="border-b border-table-border last:border-0"
                  >
                    <td className="py-2.5 font-mono text-foreground">
                      {evt.eventAction}
                    </td>
                    <td className="py-2.5">{evt.actorNameSnapshot}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {evt.serviceSource}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge
                        tone={
                          evt.outcome === "SUCCESS"
                            ? "success"
                            : evt.outcome === "DENIED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {evt.outcome}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 font-mono text-muted-foreground">
                      {formatUtcTimestamp(evt.createdAt, { locale })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
