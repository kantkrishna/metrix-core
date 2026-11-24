// frontend/src/features/shell/appearance-menu.tsx
/*
Purpose: Renders the compact icon-only Light / Dark / System theme trigger and
3-mode dropdown popover in the persistent Top Bar.

Context: Satisfies FR-CORE-006, US-01.3 AC 6, and BR-017 (collapsed button shows
only Sun, Moon, or Monitor icon; persists choice locally and via API).

Implementation Specs: Accessible menuitemradio dropdown synchronized with
ThemeProvider and PATCH /api/v1/core/me/preferences.
*/

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { UiThemeMode } from "@/contracts/enums";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";
import { cn } from "@/lib/utils";
import { useThemePreference } from "@/providers/theme-provider";

export interface AppearanceMenuProps {
  persistRemote?: boolean;
}

const OPTIONS: Array<{
  mode: UiThemeMode;
  iconKey: "light" | "dark" | "system";
  labelKey: string;
  subKey: string;
}> = [
  {
    mode: "LIGHT",
    iconKey: "light",
    labelKey: "shell.themeLight",
    subKey: "shell.themeLightSub",
  },
  {
    mode: "DARK",
    iconKey: "dark",
    labelKey: "shell.themeDark",
    subKey: "shell.themeDarkSub",
  },
  {
    mode: "SYSTEM",
    iconKey: "system",
    labelKey: "shell.themeSystem",
    subKey: "shell.themeSystemSub",
  },
];

function renderThemeIcon(mode: UiThemeMode): React.ReactElement {
  if (mode === "DARK") return <Moon className="h-4 w-4" aria-hidden="true" />;
  if (mode === "SYSTEM") {
    return <Monitor className="h-4 w-4" aria-hidden="true" />;
  }
  return <Sun className="h-4 w-4" aria-hidden="true" />;
}

export function AppearanceMenu({
  persistRemote = true,
}: AppearanceMenuProps): React.ReactElement {
  const { t } = useTranslations();
  const { preference, setPreference } = useThemePreference();
  const { requestContext } = useSession();
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

  const activeIconKey =
    preference === "DARK"
      ? "dark"
      : preference === "SYSTEM"
        ? "system"
        : "light";

  const handleSelect = (mode: UiThemeMode) => {
    setPreference(mode);
    setOpen(false);
    if (persistRemote) {
      void coreApi
        .updateUiPreferences({ uiThemeMode: mode }, requestContext)
        .catch(() => undefined);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t("a11y.switchTheme")}
        aria-haspopup="menu"
        aria-expanded={open}
        data-theme-icon={activeIconKey}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
          "transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          open
            ? "border-primary bg-sidebar-nav-active text-primary"
            : "border-border bg-card text-foreground hover:bg-layer-hover"
        )}
      >
        {renderThemeIcon(preference)}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("shell.themeHeading")}
          className="absolute end-0 top-10 z-50 w-48 rounded-lg border border-border bg-dropdown p-1.5 shadow-lg"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("shell.themeHeading")}
          </div>
          {OPTIONS.map((item) => {
            const active = preference === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleSelect(item.mode)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start",
                  active
                    ? "bg-sidebar-nav-active text-primary"
                    : "text-foreground hover:bg-layer-hover"
                )}
              >
                <span className="flex items-center gap-2">
                  {renderThemeIcon(item.mode)}
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold">
                      {t(item.labelKey)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t(item.subKey)}
                    </span>
                  </span>
                </span>
                {active ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
