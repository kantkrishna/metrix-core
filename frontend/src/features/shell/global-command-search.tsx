// frontend/src/features/shell/global-command-search.tsx
/*
Purpose: Implements the Global Command Search palette (Cmd/Ctrl+K) querying
GET /api/v1/core/search within the caller's backend RLS scope.

Context: Satisfies FR-CORE-007 and WCAG 2.1 AA modal keyboard dismissal (Esc)
without jsx-a11y/no-autofocus violations.

Implementation Specs: TanStack Query enabled when query length >= 2 with
programmatic input focus via useRef.
*/

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";

export interface GlobalCommandSearchProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}

export function GlobalCommandSearch({
  open,
  onClose,
  onNavigate,
}: GlobalCommandSearchProps): React.ReactElement | null {
  const { t } = useTranslations();
  const { requestContext } = useSession();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const searchQuery = useQuery({
    queryKey: ["global-search", requestContext.tenantId, trimmed],
    queryFn: () => coreApi.globalSearch(trimmed, 10, requestContext),
    enabled: open && trimmed.length >= 2,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("a11y.globalSearch")}
        className="w-full max-w-lg rounded-lg border border-border bg-overlay shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("shell.searchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
          />
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {trimmed.length < 2 ? (
            <p className="p-3 text-xs text-muted-foreground">
              {t("shell.searchEmpty")}
            </p>
          ) : searchQuery.isLoading ? (
            <p className="p-3 text-xs text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : (searchQuery.data?.results.length ?? 0) === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              {t("shell.searchNoResults", { query: trimmed })}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {searchQuery.data?.results.map((item) => (
                <button
                  key={`${item.entityType}-${item.id}`}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate(item.href);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-start hover:bg-layer-hover"
                >
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                  <StatusBadge tone="neutral" showDot={false}>
                    {item.entityType}
                  </StatusBadge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
