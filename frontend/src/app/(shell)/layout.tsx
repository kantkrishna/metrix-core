// frontend/src/app/(shell)/layout.tsx
/*
Purpose: Protected Unified App Shell route group layout enforcing OIDC session
presence after client hydration and rendering the persistent Top Bar and Left
Navigation rail.

Context: Enforces US-01.1 AC 1, US-01.3, and US-01.4 with zero SSR hydration
mismatch.

Implementation Specs: Waits for isHydrated before redirecting or rendering.
*/

"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";
import { UnifiedAppShell } from "@/features/shell/unified-app-shell";

export default function ProtectedShellLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isAuthenticated } = useSession();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  const moduleMatch = pathname.match(/^\/modules\/([^/]+)/);
  const activeModuleCode = moduleMatch?.[1] ?? "platform_core";
  const segment = pathname.split("/")[1] ?? "dashboard";

  return (
    <UnifiedAppShell
      activeModuleCode={activeModuleCode}
      activeRouteId={segment === "audit-logs" ? "audit" : segment}
      onNavigate={(href) => router.push(href)}
    >
      {children}
    </UnifiedAppShell>
  );
}
