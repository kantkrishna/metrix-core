// metrix-core/frontend/src/app/(shell)/layout.tsx
/*
Purpose: Protected Unified App Shell route group layout enforcing OIDC session
presence and rendering the persistent Top Bar and Left Navigation rail.

Context: Enforces US-01.1 AC 1, US-01.3, and US-01.4 across Platform Core and
downstream module boundary routes.

Implementation Specs: Redirects unauthenticated visitors to /login before
mounting protected children.
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
  const { isAuthenticated } = useSession();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const moduleMatch = pathname.match(/^\/modules\/([^/]+)/);
  const activeModuleCode = moduleMatch?.[1] ?? "platform_core";

  return (
    <UnifiedAppShell
      activeModuleCode={activeModuleCode}
      activeRouteId={pathname === "/dashboard" ? "dashboard" : ""}
      onNavigate={(href) => router.push(href)}
    >
      {children}
    </UnifiedAppShell>
  );
}
