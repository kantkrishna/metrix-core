// frontend/src/features/auth/workspace-picker-view.tsx
/*
Purpose: Renders the searchable multi-tenant Workspace Picker allowing users
with access across multiple tenants to select their active workspace and
optionally remember it across sessions.

Context: Satisfies US-01.1 AC 4 and FR-CORE-002.

Implementation Specs: Calls PATCH /api/v1/core/me/preferences when "Remember
last workspace" is checked before routing to /dashboard.
*/

"use client";

import React, { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceSummary } from "@/contracts/shell-auth.schemas";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";

export interface WorkspacePickerViewProps {
  workspaces: WorkspaceSummary[];
  onWorkspaceSelected: (tenantId: string) => void;
}

export function WorkspacePickerView({
  workspaces,
  onWorkspaceSelected,
}: WorkspacePickerViewProps): React.ReactElement {
  const { t } = useTranslations();
  const { requestContext, selectTenantWorkspace } = useSession();
  const [search, setSearch] = useState("");
  const [remember, setRemember] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (ws) =>
        ws.legalName.toLowerCase().includes(q) ||
        ws.tenantCode.toLowerCase().includes(q) ||
        ws.roleName.toLowerCase().includes(q)
    );
  }, [search, workspaces]);

  const handleSelect = async (tenantId: string) => {
    setPendingTenantId(tenantId);
    selectTenantWorkspace(tenantId);
    if (remember) {
      try {
        await coreApi.updateUiPreferences(
          { lastWorkspaceTenantId: tenantId },
          { ...requestContext, tenantId }
        );
      } catch {
        // Non-blocking preference sync failure
      }
    }
    setPendingTenantId(null);
    onWorkspaceSelected(tenantId);
  };

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background-1 p-6"
    >
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">
            {t("auth.workspacePickerTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("auth.workspacePickerSubtitle")}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("auth.searchWorkspacesPlaceholder")}
            aria-label={t("auth.searchWorkspacesPlaceholder")}
            className="h-9 w-full rounded-md border border-input bg-select px-3 text-sm text-foreground"
          />

          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("auth.rememberWorkspace")}
          </label>

          <div className="flex flex-col gap-2">
            {filtered.map((ws) => (
              <button
                key={ws.tenantId}
                type="button"
                disabled={pendingTenantId === ws.tenantId}
                onClick={() => void handleSelect(ws.tenantId)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background-1 p-3 text-start transition-colors hover:border-primary hover:bg-layer-hover"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {ws.legalName}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {ws.tenantCode}
                  </span>
                </div>
                <StatusBadge tone="info">{ws.roleName}</StatusBadge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
