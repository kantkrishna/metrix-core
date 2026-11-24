// metrix-core/frontend/src/components/ui/card.tsx
/*
Purpose: Provides composable shadcn/ui Card surface primitives styled with
METRix @theme inline tokens.

Context: Forms the structural container for KPI summaries, data tables, and
configuration panels across Platform Core.

Implementation Specs: Pure accessible semantic HTML wrappers with logical
padding utilities.
*/

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-lg border border-card-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return (
    <h3
      className={cn("text-[15px] font-semibold leading-5 tracking-tight", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}
