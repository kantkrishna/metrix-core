// frontend/src/features/shell/module-switcher.tsx
/*
Purpose: Renders the permission-driven Unified Module Switcher popover in the
persistent Top Bar for switching between Platform Core and enabled downstream
METRix modules.

Context: Satisfies US-01.4, FR-CORE-008, FR-CORE-009, and BR-015 by
distinguishing active, permitted, and admin-only locked add-on modules.

Implementation Specs: Hydrated exclusively from GET /api/v1/core/me/modules
manifest with WCAG 2.1 AA keyboard/ARIA support and externalized en-IN copy.
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Lock } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import type { AccessibleModulesManifestResponse } from "@/contracts/shell-auth.schemas";
import { filterVisibleLockedAddOns } from "@/features/shell/module-switcher-helpers";
import { useTranslations } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export interface ModuleSwitcherProps {
  manifest: AccessibleModulesManifestResponse | null;
  activeModuleCode: string;
  onSelectModule: (moduleCode: string, baseUrl: string) => void;
  onManageSubscriptions: (url: string) => void;
}

export function ModuleSwitcher({
  manifest,
  activeModuleCode,
  onSelectModule,
  onManageSubscriptions,
}: ModuleSwitcherProps): React.ReactElement {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const activeModule = useMemo(
    () =>
      manifest?.modules.find((m) => m.code === activeModuleCode) ??
      manifest?.modules[0] ??
      null,
    [manifest, activeModuleCode]
  );

  const allPermissions = useMemo(
    () => manifest?.modules.flatMap((m) => m.effectivePermissions) ?? [],
    [manifest]
  );

  const visibleLockedAddOns = useMemo(
    () =>
      filterVisibleLockedAddOns(manifest?.lockedAddOns ?? [], allPermissions),
    [manifest, allPermissions]
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t("a11y.switchModule")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-semibold",
          "transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          open
            ? "border-primary bg-sidebar-nav-active text-primary"
            : "border-border bg-card text-foreground hover:bg-layer-hover"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[140px] truncate">
          {activeModule?.name ?? t("common.appName")}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("shell.moduleSwitcherTitle")}
          className="absolute start-0 top-10 z-50 w-96 max-w-[92vw] rounded-lg border border-border bg-popover p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shell.moduleSwitcherTitle")}
            </span>
            {manifest?.organizationName ? (
              <StatusBadge tone="info" showDot={false}>
                {manifest.organizationName}
              </StatusBadge>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            {(manifest?.modules ?? []).map((mod) => {
              const isCurrent = mod.code === activeModuleCode;
              return (
                <button
                  key={mod.code}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSelectModule(mod.code, mod.baseUrl);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-start transition-colors",
                    isCurrent
                      ? "border-primary bg-sidebar-nav-active"
                      : "border-border bg-background-1 hover:bg-layer-hover"
                  )}
                >
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isCurrent ? "text-primary" : "text-foreground"
                      )}
                    >
                      {mod.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {mod.description}
                    </span>
                  </span>
                  <StatusBadge tone={isCurrent ? "info" : "success"}>
                    {isCurrent
                      ? t("shell.currentModuleBadge")
                      : t("shell.activeModuleBadge")}
                  </StatusBadge>
                </button>
              );
            })}
          </div>

          {visibleLockedAddOns.length > 0 ? (
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{t("shell.gatedAddOnsHeading")}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onManageSubscriptions("/subscriptions");
                  }}
                  className="text-primary hover:underline"
                >
                  {t("shell.manageSubscriptions")}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {visibleLockedAddOns.map((addon) => (
                  <button
                    key={addon.code}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onManageSubscriptions(addon.manageSubscriptionUrl);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2.5 text-start hover:border-primary"
                  >
                    <span className="flex items-center gap-2.5">
                      <Lock
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="flex flex-col">
                        <span className="text-xs font-semibold text-muted-foreground-1">
                          {addon.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {addon.description}
                        </span>
                      </span>
                    </span>
                    <StatusBadge tone="neutral" showDot={false}>
                      {t("shell.addOnBadge")}
                    </StatusBadge>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-3 rounded-md bg-card-header px-2.5 py-2 text-[11px] text-muted-foreground">
            {t("shell.contextPreserved")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
