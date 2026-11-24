// metrix-core/frontend/src/providers/app-providers.tsx
/*
Purpose: Composes top-level React providers (TanStack Query, Theme, I18N,
Session, Radix Tooltip, and Sonner Toast) for the METRix Platform Core App
Shell.

Context: Isolates client-side state providers cleanly from Server Components in
Next.js App Router while preventing cross-request query cache sharing.

Implementation Specs: Instantiates QueryClient per browser session with retry
disabled on 401/403/404/409/410/422 RFC 9457 responses.
*/

"use client";

import React, { useState } from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ApiProblemError } from "@/contracts/problem-details";
import { SessionProvider } from "@/features/auth/session-context";
import { I18nProvider } from "@/i18n/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiProblemError) {
    if ([400, 401, 403, 404, 409, 410, 422].includes(error.status)) {
      return false;
    }
  }
  return failureCount < 2;
}

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultPreference="SYSTEM">
        <I18nProvider>
          <SessionProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </TooltipProvider>
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
