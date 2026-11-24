// metrix-core/frontend/src/components/ui/skeleton.tsx
/*
Purpose: Provides an accessible loading skeleton shimmer primitive for dashboard
KPIs and data tables during asynchronous hydration.

Context: Supports US-01.2 AC 5 and standardized loading states in the Figma
System & Edge States gallery.

Implementation Specs: Uses aria-hidden pulsing surface token styling.
*/

import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-1", className)}
      {...props}
    />
  );
}
