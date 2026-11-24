// frontend/src/providers/theme-provider.tsx
/*
Purpose: Manages Light, Dark, and System appearance state aligned with OpenAPI
UiThemeMode (LIGHT | DARK | SYSTEM) and @theme inline .dark class toggling.

Context: Satisfies FR-CORE-006, BR-017, and US-01.3 AC 6 for flicker-free
theme persistence across sessions and modules.

Implementation Specs: Synchronizes with window.matchMedia when set to SYSTEM
and persists locally while exposing a hook for backend /me/preferences sync.
*/

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UiThemeMode } from "@/contracts/enums";

export const THEME_STORAGE_KEY = "metrix.core.uiThemeMode";

export interface ThemeContextValue {
  preference: UiThemeMode;
  resolvedTheme: "light" | "dark";
  setPreference: (mode: UiThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredPreference(fallback: UiThemeMode): UiThemeMode {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "LIGHT" || raw === "DARK" || raw === "SYSTEM") {
    return raw;
  }
  return fallback;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPreference?: UiThemeMode;
}

export function ThemeProvider({
  children,
  defaultPreference = "SYSTEM",
}: ThemeProviderProps): React.ReactElement {
  const [preference, setPreferenceState] = useState<UiThemeMode>(() =>
    readStoredPreference(defaultPreference)
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => readSystemDark());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

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
    setPreferenceState(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
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
