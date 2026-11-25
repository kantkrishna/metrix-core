// frontend/src/features/auth/oidc-sign-in-view.tsx
/*
Purpose: Renders the delegated OIDC Sign-In screen allowing optional workspace
slug or work email routing to an Enterprise SSO identity provider.

Context: Satisfies US-01.1 AC 1, AC 2, and BR-004 (strictly zero password
collection or storage in Platform Core).

Implementation Specs: Calls POST /api/v1/core/auth/oidc/discover via TanStack
Query mutation and initiates PKCE redirect with injectable onRedirect hook.
*/

"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiProblemError } from "@/contracts/problem-details";
import { createOidcTransaction } from "@/features/auth/pkce-utils";
import { AppearanceMenu } from "@/features/shell/appearance-menu";
import { useTranslations } from "@/i18n/i18n-provider";
import { coreApi } from "@/lib/api/platform-core-api";

export interface OidcSignInViewProps {
  onRedirect?: (authorizationUrl: string) => void;
}

export function OidcSignInView({
  onRedirect,
}: OidcSignInViewProps): React.ReactElement {
  const { t } = useTranslations();
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [email, setEmail] = useState("");

  const discoverMutation = useMutation({
    mutationFn: () =>
      coreApi.discoverOidc({
        workspaceSlug: workspaceSlug.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onSuccess: (data) => {
      const { state } = createOidcTransaction();
      const target = new URL(data.authorizationUrl);
      target.searchParams.set("state", state);
      if (onRedirect) {
        onRedirect(target.toString());
      } else if (typeof window !== "undefined") {
        window.location.assign(target.toString());
      }
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    discoverMutation.mutate();
  };

  const errorText =
    discoverMutation.error instanceof ApiProblemError
      ? discoverMutation.error.message
      : discoverMutation.isError
        ? t("auth.discoverError")
        : null;

  return (
    <main
      id="main-content"
      className="grid min-h-screen grid-cols-1 lg:grid-cols-2"
    >
      <section className="hidden flex-col justify-between bg-navbar-inverse p-12 text-foreground-inverse lg:flex">
        <div className="flex flex-col gap-4">
          <StatusBadge tone="info" className="w-fit">
            {t("common.appName")}
          </StatusBadge>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("common.appName")}
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("auth.signInSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="success">{t("auth.badgeOidc")}</StatusBadge>
          <StatusBadge tone="info">{t("auth.badgeIsolated")}</StatusBadge>
          <StatusBadge tone="neutral">{t("auth.badgeAudit")}</StatusBadge>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background-1 p-6">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xl">{t("auth.signInTitle")}</CardTitle>
            <AppearanceMenu persistRemote={false} />
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-xs text-muted-foreground">
              {t("auth.signInSubtitle")}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="workspace-slug"
                  className="text-xs font-medium text-foreground"
                >
                  {t("auth.workspaceSlugLabel")}
                </label>
                <input
                  id="workspace-slug"
                  type="text"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  placeholder={t("auth.workspaceSlugPlaceholder")}
                  className="h-9 rounded-md border border-input bg-select px-3 text-sm text-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="work-email"
                  className="text-xs font-medium text-foreground"
                >
                  {t("auth.emailLabel")}
                </label>
                <input
                  id="work-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  className="h-9 rounded-md border border-input bg-select px-3 text-sm text-foreground"
                />
              </div>

              {errorText ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive bg-status-destructive-bg p-3 text-xs text-destructive"
                >
                  {errorText}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={discoverMutation.isPending}
                className="w-full"
              >
                {discoverMutation.isPending
                  ? t("auth.redirectingOidc")
                  : t("auth.continueOidc")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
