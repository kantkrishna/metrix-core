// frontend/src/app/login/page.tsx
/*
Purpose: Renders the /login route for delegated OIDC sign-in.

Context: Entry point for US-01.1.

Implementation Specs: Mounts OidcSignInView.
*/

import React from "react";
import { OidcSignInView } from "@/features/auth/oidc-sign-in-view";

export default function LoginPage(): React.ReactElement {
  return <OidcSignInView />;
}
