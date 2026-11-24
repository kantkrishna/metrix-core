// frontend/src/app/(shell)/dashboard/page.tsx
/*
Purpose: Renders the /dashboard route inside the protected Unified App Shell.

Context: Primary landing route for US-01.2.

Implementation Specs: Mounts ExecutiveDashboardView.
*/

import React from "react";
import { ExecutiveDashboardView } from "@/features/dashboard/executive-dashboard-view";

export default function DashboardPage(): React.ReactElement {
  return <ExecutiveDashboardView />;
}
