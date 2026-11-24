// metrix-core/frontend/src/lib/utils.ts
/*
Purpose: Provides class-name composition utility for shadcn/ui and Tailwind v4
components.

Context: Ensures deterministic conflict resolution when composing Tailwind utility
classes across reusable enterprise UI primitives.

Implementation Specs: Combines clsx conditional classes with tailwind-merge.
*/

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
