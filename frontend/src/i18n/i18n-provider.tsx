// frontend/src/i18n/i18n-provider.tsx
/*
Purpose: Provides externalized BCP-47 message resolution and deterministic
fallback to en-IN across the Platform Core React tree.

Context: Satisfies FR-CORE-040, BR-023, and NFR-I18N-02 (User -> Tenant ->
Platform en-IN locale hierarchy with zero raw translation keys surfaced).

Implementation Specs: Supports nested dot-path message keys and {param}
interpolation while keeping canonical RBAC/API identifiers language-neutral.
*/

"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { publicEnv } from "@/config/env";
import enIN from "@/i18n/messages/en-IN.json";

export type MessageDictionary = Record<string, unknown>;

const DEFAULT_LOCALE = "en-IN";

const BUILTIN_BUNDLES: Record<string, MessageDictionary> = {
  "en-IN": enIN as MessageDictionary,
};

export interface LocaleHierarchy {
  userLocale?: string | null;
  tenantLocale?: string | null;
  platformLocale?: string | null;
}

export function resolveEffectiveLocale(
  hierarchy: LocaleHierarchy,
  enabledLocales: readonly string[] = [DEFAULT_LOCALE]
): string {
  const candidates = [
    hierarchy.userLocale,
    hierarchy.tenantLocale,
    hierarchy.platformLocale,
    publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE,
    DEFAULT_LOCALE,
  ];

  for (const candidate of candidates) {
    if (candidate && enabledLocales.includes(candidate)) {
      return candidate;
    }
  }
  return DEFAULT_LOCALE;
}

function lookupPath(dict: MessageDictionary, key: string): string | null {
  const segments = key.split(".");
  let current: unknown = dict;
  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return typeof current === "string" ? current : null;
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    token in params ? String(params[token]) : ""
  );
}

export interface I18nContextValue {
  locale: string;
  enabledLocales: readonly string[];
  setUserLocale: (nextLocale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialHierarchy?: LocaleHierarchy;
  bundles?: Record<string, MessageDictionary>;
}

export function I18nProvider({
  children,
  initialHierarchy,
  bundles = BUILTIN_BUNDLES,
}: I18nProviderProps): React.ReactElement {
  const enabledLocales = useMemo(() => Object.keys(bundles), [bundles]);
  const [userLocale, setUserLocaleState] = useState<string | null>(
    initialHierarchy?.userLocale ?? null
  );

  const locale = useMemo(
    () =>
      resolveEffectiveLocale(
        {
          userLocale,
          tenantLocale: initialHierarchy?.tenantLocale,
          platformLocale: initialHierarchy?.platformLocale,
        },
        enabledLocales
      ),
    [userLocale, initialHierarchy, enabledLocales]
  );

  const value = useMemo<I18nContextValue>(() => {
    const activeBundle = bundles[locale] ?? bundles[DEFAULT_LOCALE] ?? enIN;
    const fallbackBundle = bundles[DEFAULT_LOCALE] ?? enIN;

    const t = (
      key: string,
      params?: Record<string, string | number>
    ): string => {
      const resolved =
        lookupPath(activeBundle, key) ?? lookupPath(fallbackBundle, key);
      if (!resolved) {
        return "";
      }
      return interpolate(resolved, params);
    };

    return {
      locale,
      enabledLocales,
      setUserLocale: (nextLocale: string) => {
        if (enabledLocales.includes(nextLocale)) {
          setUserLocaleState(nextLocale);
        }
      },
      t,
    };
  }, [bundles, enabledLocales, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslations must be used within an I18nProvider.");
  }
  return ctx;
}
