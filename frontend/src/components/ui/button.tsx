// frontend/src/components/ui/button.tsx
/*
Purpose: Provides the reusable shadcn/ui Button primitive mapped to METRix
Platform Core @theme inline tokens.

Context: Mirrors Figma Component Set Input/Button (primary, secondary, outline,
destructive, ghost) with WCAG 2.1 AA focus-visible indicators.

Implementation Specs: Uses Radix Slot for asChild composition and CVA variants.
*/

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md " +
    "text-xs font-semibold transition-colors disabled:pointer-events-none " +
    "disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-ring",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover " +
          "active:bg-primary-active",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        outline:
          "border border-border bg-card text-foreground hover:bg-layer-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        ghost:
          "bg-transparent text-muted-foreground-1 hover:bg-surface " +
          "hover:text-foreground",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3.5 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
