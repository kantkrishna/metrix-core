// frontend/src/app/workspaces/page.tsx
/*
Purpose: Renders the /workspaces multi-tenant selector route after OIDC sign-in.

Context: Satisfies US-01.1 AC 4 with hydration-safe session verification.

Implementation Specs: Hydrates workspaces from SessionContext or GET
/auth/workspaces only after isHydrated is true.
*/

"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";
import { WorkspacePickerView } from "@/features/auth/workspace-picker-view";
import { coreApi } from "@/lib/api/platform-core-api";

export default function WorkspacesPage(): React.ReactElement | null {
  const router = useRouter();
  const { isHydrated, isAuthenticated, workspaces, requestContext } =
    useSession();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  const query = useQuery({
    queryKey: ["auth-workspaces"],
    queryFn: () => coreApi.listWorkspaces(requestContext),
    enabled: isHydrated && isAuthenticated && workspaces.length === 0,
  });

  if (!isHydrated || !isAuthenticated) return null;

  const list = workspaces.length > 0 ? workspaces : (query.data?.items ?? []);
  return (
    <WorkspacePickerView
      workspaces={list}
      onWorkspaceSelected={() => router.replace("/dashboard")}
    />
  );
}
