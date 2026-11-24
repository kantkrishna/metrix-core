// metrix-core/frontend/src/features/auth/oidc-callback-view.tsx
/*
Purpose: Completes delegated OIDC authorization code exchange, routes single-
tenant users to /dashboard or multi-tenant users to /workspaces, and handles
suspended-account denials or cancelled callbacks cleanly.

Context: Satisfies US-01.1 AC 3, AC 4, AC 5, and AC 6.

Implementation Specs: StrictMode-safe async PKCE exchange calling
POST /api/v1/core/auth/oidc/callback without synchronous setState in effects.
*/

"use client";

import React, { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiProblemError } from "@/contracts/problem-details";
import { consumeOidcTransaction } from "@/features/auth/pkce-utils";
import { useSession } from "@/features/auth/session-context";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";

export interface OidcCallbackViewProps {
  code?: string | null;
  state?: string | null;
  oidcError?: string | null;
  onNavigate: (path: string) => void;
}

export function OidcCallbackView({
  code,
  state,
  oidcError,
  onNavigate,
}: OidcCallbackViewProps): React.ReactElement {
  const { t } = useTranslations();
  const { establishSession } = useSession();
  const startedRef = useRef(false);
  const hasMissingParams = Boolean(oidcError || !code || !state);

  const [failure, setFailure] = useState<{
    suspended: boolean;
    message: string;
  } | null>(() =>
    hasMissingParams
      ? { suspended: false, message: t("auth.callbackErrorDetail") }
      : null
  );

  useEffect(() => {
    if (startedRef.current || hasMissingParams || !code || !state) return;
    startedRef.current = true;

    void Promise.resolve().then(async () => {
      const tx = consumeOidcTransaction(state);
      if (!tx.valid || !tx.codeVerifier) {
        setFailure({ suspended: false, message: t("auth.callbackErrorDetail") });
        return;
      }

      try {
        const response = await coreApi.completeOidcCallback({
          code,
          state,
          codeVerifier: tx.codeVerifier,
        });
        const autoTenantId = establishSession(response);
        if (response.workspaces.length > 1 && !autoTenantId) {
          onNavigate("/workspaces");
        } else {
          onNavigate("/dashboard");
        }
      } catch (err: unknown) {
        if (err instanceof ApiProblemError && err.status === 403) {
          setFailure({
            suspended: true,
            message: t("auth.accountSuspended"),
          });
          return;
        }
        setFailure({
          suspended: false,
          message: t("auth.callbackErrorDetail"),
        });
      }
    });
  }, [code, establishSession, hasMissingParams, onNavigate, state, t]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background-1 p-6"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {failure
              ? t("auth.callbackErrorTitle")
              : t("auth.completingSignIn")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {failure ? (
            <>
              <StatusBadge tone="destructive" className="w-fit">
                {failure.suspended ? "403" : "OIDC"}
              </StatusBadge>
              <p role="alert" className="text-sm text-muted-foreground">
                {failure.message}
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => onNavigate("/login")}
              >
                {t("common.tryAgain")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
