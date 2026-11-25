// frontend/src/providers/theme-provider.tsx
/*
Purpose: Manages Light, Dark, and System appearance state aligned with OpenAPI
UiThemeMode (LIGHT | DARK | SYSTEM) and @theme inline .dark class toggling.

Context: Satisfies FR-CORE-006, BR-017, and US-01.3 AC 6 with zero SSR/client
hydration mismatch in Next.js App Router.

Implementation Specs: Uses useSyncExternalStore for localStorage and matchMedia
reads so SSR and initial hydration always render identical markup.
*/

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { UiThemeMode } from "@/contracts/enums";

export const THEME_STORAGE_KEY = "metrix.core.uiThemeMode";

export interface ThemeContextValue {
  preference: UiThemeMode;
  resolvedTheme: "light" | "dark";
  setPreference: (mode: UiThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeListeners = new Set<() => void>();

function notifyThemeListeners(): void {
  for (const listener of themeListeners) {
    listener();
  }
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  if (typeof window === "undefined") {
    return () => themeListeners.delete(listener);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystemDark(listener: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getSystemDarkSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPreference?: UiThemeMode;
}

export function ThemeProvider({
  children,
  defaultPreference = "SYSTEM",
}: ThemeProviderProps): React.ReactElement {
  const getPreferenceSnapshot = useCallback((): UiThemeMode => {
    if (typeof window === "undefined") return defaultPreference;
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "LIGHT" || raw === "DARK" || raw === "SYSTEM") {
      return raw;
    }
    return defaultPreference;
  }, [defaultPreference]);

  const preference = useSyncExternalStore(
    subscribeTheme,
    getPreferenceSnapshot,
    () => defaultPreference
  );

  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    () => false
  );

  const resolvedTheme: "light" | "dark" =
    preference === "DARK" || (preference === "SYSTEM" && systemDark)
      ? "dark"
      : "light";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.themePreference = preference;
  }, [preference, resolvedTheme]);

  const setPreference = useCallback((mode: UiThemeMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    notifyThemeListeners();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemePreference must be used within a ThemeProvider.");
  }
  return ctx;
}
