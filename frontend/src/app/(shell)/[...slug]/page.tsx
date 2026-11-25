// metrix-core/frontend/src/app/(shell)/[...slug]/page.tsx
/*
Purpose: Renders an in-shell informational boundary for registered Platform Core
navigation routes (e.g., /notifications, /tenants/[id], /subscriptions) whose
Epics are not yet implemented.

Context: Prevents raw 404 pages when testing Epic 1 Top Bar, Left Nav, and
Global Command Search links while staying strictly scoped to Epic 1.

Implementation Specs: Client component consuming externalized en-IN copy and
routing back to /dashboard while preserving shell pin, theme, and org context.
*/

"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/i18n/i18n-provider";

export default function UpcomingShellRoutePage(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslations();

  return (
    <Card className="max-w-xl">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{t("shell.routeComingSoonTitle")}</CardTitle>
        <StatusBadge tone="info">EP-01</StatusBadge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          {t("shell.routeComingSoonDetail", { path: pathname })}
        </p>
        <div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            {t("shell.returnToCore")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
