// frontend/src/app/layout.tsx
/*
Purpose: Root Next.js App Router layout configuring typography (Inter +
JetBrains Mono), flicker-free theme hydration, accessibility skip link, and
top-level client providers.

Context: Enforces WCAG 2.1 AA landmark structure (NFR-A11Y-01) and BCP-47 lang
attribute (en-IN baseline, NFR-I18N-02).

Implementation Specs: Injects a minimal synchronous script to apply .dark prior
to first paint when LIGHT/DARK/SYSTEM resolves to dark.
*/

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { publicEnv } from "@/config/env";
import { AppProviders } from "@/providers/app-providers";
import { THEME_STORAGE_KEY } from "@/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: publicEnv.NEXT_PUBLIC_APP_NAME,
  description:
    "Centralized multi-tenant administration, RBAC, subscriptions, " +
    "entitlements, audit logs, and unified App Shell for Advantax Tax METRix.",
};

const themeInitScript = [
  "(function () {",
  "  try {",
  `    var pref = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "SYSTEM";`,
  '    var sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;',
  '    var isDark = pref === "DARK" || (pref === "SYSTEM" && sysDark);',
  '    document.documentElement.classList.toggle("dark", isDark);',
  "    document.documentElement.dataset.themePreference = pref;",
  "  } catch (e) {}",
  "})();",
].join("\n");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html
      lang={publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background-1 font-sans text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
