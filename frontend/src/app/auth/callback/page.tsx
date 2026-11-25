// frontend/src/app/auth/callback/page.tsx
/*
Purpose: Handles the /auth/callback redirect from the managed OIDC provider.

Context: Exchanges authorization code and routes users per US-01.1 AC 3-6.

Implementation Specs: Wraps useSearchParams inside React Suspense for Next.js 16
static/dynamic rendering compatibility.
*/

"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OidcCallbackView } from "@/features/auth/oidc-callback-view";

function CallbackContent(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <OidcCallbackView
      code={params.get("code")}
      state={params.get("state")}
      oidcError={params.get("error")}
      onNavigate={(path) => router.replace(path)}
    />
  );
}

export default function AuthCallbackPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
