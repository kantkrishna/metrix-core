// frontend/src/features/shell/unified-app-shell.tsx
/*
Purpose: Provides the unified 56px Top Bar and collapsible/pinnable 260px Left
Navigation shell with Pin Down / Pin Up icons, responsive <1024px override,
Unified Module Switcher, Global Command Search, and Appearance Menu.

Context: Satisfies US-01.3, US-01.4, FR-CORE-004 through FR-CORE-009, BR-017,
and WCAG 2.1 AA landmarks (<nav>, <aside>, role="dialog").

Implementation Specs: Hydrates GET /api/v1/core/me/modules and
GET /api/v1/core/health/services via TanStack Query and persists pin changes via
PATCH /api/v1/core/me/preferences.
*/

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  FileText,
  KeyRound,
  LayoutDashboard,
  Menu,
  Pin,
  PinOff,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import { AppearanceMenu } from "@/features/shell/appearance-menu";
import { GlobalCommandSearch } from "@/features/shell/global-command-search";
import { ModuleSwitcher } from "@/features/shell/module-switcher";
import { resolveSidebarPresentation } from "@/features/shell/navigation-state";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";
import { cn } from "@/lib/utils";

interface NavItemDef {
  id: string;
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CORE_NAV_GROUPS: Array<{ groupKey: string; items: NavItemDef[] }> = [
  {
    groupKey: "nav.groupOverview",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupKey: "nav.groupTenancy",
    items: [
      {
        id: "tenants",
        href: "/tenants",
        labelKey: "nav.tenants",
        icon: Building2,
      },
      {
        id: "organizations",
        href: "/organizations",
        labelKey: "nav.organizations",
        icon: Building2,
      },
    ],
  },
  {
    groupKey: "nav.groupIdentity",
    items: [
      { id: "users", href: "/users", labelKey: "nav.users", icon: Users },
      { id: "roles", href: "/roles", labelKey: "nav.roles", icon: Shield },
      {
        id: "memberships",
        href: "/memberships",
        labelKey: "nav.memberships",
        icon: KeyRound,
      },
    ],
  },
  {
    groupKey: "nav.groupCommercials",
    items: [
      {
        id: "subscriptions",
        href: "/subscriptions",
        labelKey: "nav.subscriptions",
        icon: FileText,
      },
    ],
  },
  {
    groupKey: "nav.groupGovernance",
    items: [
      {
        id: "config",
        href: "/config",
        labelKey: "nav.config",
        icon: Settings,
      },
      {
        id: "audit",
        href: "/audit-logs",
        labelKey: "nav.audit",
        icon: FileText,
      },
      {
        id: "notifications",
        href: "/notifications",
        labelKey: "nav.notifications",
        icon: Bell,
      },
    ],
  },
];

export interface UnifiedAppShellProps {
  children: React.ReactNode;
  activeModuleCode?: string;
  activeRouteId?: string;
  onNavigate?: (href: string) => void;
}

export function UnifiedAppShell({
  children,
  activeModuleCode = "platform_core",
  activeRouteId = "dashboard",
  onNavigate,
}: UnifiedAppShellProps): React.ReactElement {
  const { t } = useTranslations();
  const { requestContext, activeOrganizationId, signOut } = useSession();

  const [savedPinnedOverride, setSavedPinnedOverride] = useState<
    boolean | null
  >(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const manifestQuery = useQuery({
    queryKey: ["me-modules", requestContext.tenantId, activeOrganizationId],
    queryFn: () =>
      coreApi.getAccessibleModules(
        { organizationId: activeOrganizationId, includeLockedAddOns: true },
        requestContext
      ),
  });

  const healthQuery = useQuery({
    queryKey: ["health-services"],
    queryFn: () => coreApi.getServicesHealth(requestContext),
  });

  const savedPinned =
    savedPinnedOverride ??
    manifestQuery.data?.uiPreferences.uiNavPinned ??
    false;

  const presentation = resolveSidebarPresentation({
    savedPinned,
    isOverlayOpen,
    viewportWidth,
  });

  const navigate = useCallback(
    (href: string) => {
      setIsOverlayOpen(false);
      if (onNavigate) {
        onNavigate(href);
      } else if (typeof window !== "undefined") {
        window.location.assign(href);
      }
    },
    [onNavigate]
  );

  const togglePin = useCallback(() => {
    const nextPinned = !savedPinned;
    setSavedPinnedOverride(nextPinned);
    setIsOverlayOpen(!nextPinned);
    void coreApi
      .updateUiPreferences({ uiNavPinned: nextPinned }, requestContext)
      .catch(() => undefined);
  }, [requestContext, savedPinned]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsOverlayOpen((prev) => !prev);
      } else if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePin();
      } else if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setIsOverlayOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePin]);

  const sidebarContent = (isPinned: boolean) => (
    <div className="flex h-full w-[260px] flex-col justify-between border-e border-sidebar-border bg-sidebar">
      <div>
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              M
            </span>
            <span className="text-xs font-bold text-foreground">
              {t("common.appName")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={
                isPinned ? t("a11y.unpinNavigation") : t("a11y.pinNavigation")
              }
              data-pin-state={isPinned ? "pinned" : "unpinned"}
              onClick={togglePin}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md border",
                isPinned
                  ? "border-primary bg-sidebar-nav-active text-primary"
                  : "border-border bg-card text-muted-foreground-1 hover:bg-layer-hover"
              )}
            >
              {isPinned ? (
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            {!isPinned ? (
              <button
                type="button"
                aria-label={t("a11y.closeNavigation")}
                onClick={() => setIsOverlayOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground-1 hover:bg-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <nav
          aria-label={t("a11y.primaryNavigation")}
          className="flex flex-col gap-3 p-3"
        >
          {CORE_NAV_GROUPS.map((group) => (
            <div key={group.groupKey} className="flex flex-col gap-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.groupKey)}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeRouteId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-xs transition-colors",
                      active
                        ? "border-s-2 border-primary bg-sidebar-nav-active font-semibold text-primary"
                        : "font-medium text-sidebar-nav-foreground hover:bg-layer-hover"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-sidebar-border bg-card-header p-3">
        <StatusBadge tone="success" className="w-fit">
          {t("common.statusOperational", {
            operational: healthQuery.data?.operationalCount ?? 4,
            total: healthQuery.data?.totalCount ?? 4,
          })}
        </StatusBadge>
        <span className="text-[10px] text-muted-foreground">
          {isPinned ? t("nav.pinnedHint") : t("nav.overlayHint")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-1 text-foreground">
      {presentation === "pinned" ? (
        <aside className="fixed inset-y-0 start-0 z-30">
          {sidebarContent(true)}
        </aside>
      ) : null}

      {presentation === "overlay" ? (
        <div className="fixed inset-0 z-40 flex">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("a11y.primaryNavigation")}
            className="relative z-10 h-full shadow-2xl"
          >
            {sidebarContent(false)}
          </div>
          <button
            type="button"
            aria-label={t("a11y.closeNavigation")}
            onClick={() => setIsOverlayOpen(false)}
            className="flex-1 bg-black/30"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-200",
          presentation === "pinned" ? "ms-[260px]" : "ms-0"
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-navbar-border bg-navbar px-4">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("a11y.openNavigation")}
              aria-expanded={presentation !== "hidden"}
              onClick={() =>
                presentation === "pinned"
                  ? togglePin()
                  : setIsOverlayOpen((prev) => !prev)
              }
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>

            <ModuleSwitcher
              manifest={manifestQuery.data ?? null}
              activeModuleCode={activeModuleCode}
              onSelectModule={(_code, url) => navigate(url)}
              onManageSubscriptions={(url) => navigate(url)}
            />

            <span className="hidden rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground md:inline-flex">
              {manifestQuery.data?.organizationName ??
                t("shell.allTenantsContext")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("a11y.globalSearch")}
              onClick={() => setIsSearchOpen(true)}
              className="hidden h-8 w-52 items-center justify-between rounded-md border border-border bg-background-1 px-2.5 text-xs text-muted-foreground hover:bg-layer-hover sm:inline-flex"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                {t("shell.searchPlaceholder")}
              </span>
              <kbd className="font-mono text-[10px] font-semibold">⌘K</kbd>
            </button>

            <AppearanceMenu />

            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t("a11y.notifications")}
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {manifestQuery.data?.uiPreferences.unreadNotificationCount ?? 0}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut().then(() => navigate("/login"));
              }}
            >
              {t("common.signOut")}
            </Button>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>

      <GlobalCommandSearch
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}
