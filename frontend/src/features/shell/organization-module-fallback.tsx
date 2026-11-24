// metrix-core/frontend/src/features/shell/organization-module-fallback.tsx
/*
Purpose: Renders the non-destructive graceful fallback banner and eligible
organization list when a user switches to a module disabled on the currently
selected organization.

Context: Satisfies US-01.5 AC 1 through AC 5, FR-CORE-010, BR-003, and BR-016.

Implementation Specs: Displays only backend RLS-filtered eligible organizations
and hides the entitlement management CTA when canManageEntitlements is false.
*/

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/i18n/i18n-provider";

export interface EligibleOrganizationItem {
  id: string;
  orgCode: string;
  legalName: string;
}

export interface OrganizationModuleFallbackProps {
  moduleName: string;
  currentOrganizationName: string;
  eligibleOrganizations: EligibleOrganizationItem[];
  canManageEntitlements: boolean;
  onSwitchOrganization: (organizationId: string) => void;
  onManageEntitlements: () => void;
}

export function OrganizationModuleFallback({
  moduleName,
  currentOrganizationName,
  eligibleOrganizations,
  canManageEntitlements,
  onSwitchOrganization,
  onManageEntitlements,
}: OrganizationModuleFallbackProps): React.ReactElement {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-5">
      <div
        role="status"
        className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-status-warning bg-status-warning-bg p-5"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-status-warning bg-card p-2 text-status-warning">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">
              {t("shell.orgFallbackTitle", {
                moduleName,
                organizationName: currentOrganizationName,
              })}
            </h2>
            <p className="max-w-2xl text-xs text-muted-foreground-1">
              {t("shell.orgFallbackDetail")}
            </p>
          </div>
        </div>

        {canManageEntitlements ? (
          <Button
            type="button"
            variant="outline"
            onClick={onManageEntitlements}
          >
            {t("shell.manageEntitlementsCta")}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("shell.eligibleOrgsHeading", { moduleName })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eligibleOrganizations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("shell.orgFallbackEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {eligibleOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background-1 p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {org.legalName}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {org.orgCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone="success">
                      {t("shell.activeModuleBadge")}
                    </StatusBadge>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => onSwitchOrganization(org.id)}
                    >
                      {org.legalName}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
