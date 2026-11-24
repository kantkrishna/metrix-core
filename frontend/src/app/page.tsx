// frontend/src/app/page.tsx
/*
Purpose: Root entry route redirecting authenticated users to /dashboard and
unauthenticated users to /login without exposing protected tenant data.

Context: Enforces US-01.1 AC 1 entry protection.

Implementation Specs: Client redirect using Next.js App Router useRouter.
*/

"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";

export default function RootEntryPage(): React.ReactElement {
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const { t } = useTranslations();

  useEffect(() => {
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, router]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground"
    >
      {t("common.loading")}
    </main>
  );
}
