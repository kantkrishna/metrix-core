// frontend/src/components/ui/badge.tsx
/*
Purpose: Provides the reusable StatusBadge primitive mapped to METRix Platform
Core Light/Dark status tokens.

Context: Mirrors Figma Component Set Feedback/StatusBadge (success, warning,
destructive, info, neutral) with accessible contrast ratios.

Implementation Specs: Uses CVA tone variants with optional status indicator dot.
*/

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] " +
    "font-medium leading-4",
  {
    variants: {
      tone: {
        success: "bg-status-success-bg text-status-success",
        warning: "bg-status-warning-bg text-status-warning",
        destructive: "bg-status-destructive-bg text-destructive",
        info: "bg-status-info-bg text-status-info",
        neutral: "bg-surface text-muted-foreground-1",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean;
}

export function StatusBadge({
  className,
  tone,
  showDot = true,
  children,
  ...props
}: StatusBadgeProps): React.ReactElement {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {showDot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
