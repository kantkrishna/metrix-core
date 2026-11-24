// metrix-core/frontend/src/features/auth/oidc-callback-view.tsx
/*
Purpose: Completes delegated OIDC authorization code exchange, routes single-
tenant users to /dashboard or multi-tenant users to /workspaces, and handles
suspended-account denials or cancelled callbacks cleanly.

Context: Satisfies US-01.1 AC 3, AC 4, AC 5, and AC 6.

Implementation Specs: Executes POST /api/v1/core/auth/oidc/callback once per
callback mount safely under React 19 StrictMode without discarding in-flight
responses.
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
  const mountedRef = useRef(true);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [failure, setFailure] = useState<{
    suspended: boolean;
    message: string;
  } | null>(() =>
    oidcError || !code || !state
      ? { suspended: false, message: t("auth.callbackErrorDetail") }
      : null
  );

  useEffect(() => {
    if (startedRef.current || oidcError || !code || !state) return;
    startedRef.current = true;

    const tx = consumeOidcTransaction(state);
    if (!tx.valid || !tx.codeVerifier) {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setFailure({
          suspended: false,
          message: t("auth.callbackErrorDetail"),
        });
      });
      return;
    }

    coreApi
      .completeOidcCallback({ code, state, codeVerifier: tx.codeVerifier })
      .then((response) => {
        if (!mountedRef.current) return;
        const autoTenantId = establishSession(response);
        if (response.workspaces.length > 1 && !autoTenantId) {
          onNavigateRef.current("/workspaces");
        } else {
          onNavigateRef.current("/dashboard");
        }
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
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
      });
  }, [code, establishSession, oidcError, state, t]);

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
