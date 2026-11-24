// frontend/src/features/shell/navigation-state.ts
/*
Purpose: Pure state transition helpers for collapsible/pinnable sidebar
presentation and responsive <1024px breakpoint override.

Context: Satisfies FR-CORE-004, FR-CORE-005, and US-01.3 AC 1 through AC 5
without mutating saved desktop preferences on narrow viewports.

Implementation Specs: Pure TypeScript functions shared by UI and BDD tests.
*/

export const DESKTOP_PIN_BREAKPOINT = 1024;

export type SidebarPresentation = "hidden" | "overlay" | "pinned";

export function resolveSidebarPresentation(input: {
  savedPinned: boolean;
  isOverlayOpen: boolean;
  viewportWidth: number;
}): SidebarPresentation {
  const isDesktop = input.viewportWidth >= DESKTOP_PIN_BREAKPOINT;
  if (input.savedPinned && isDesktop) {
    return "pinned";
  }
  return input.isOverlayOpen ? "overlay" : "hidden";
}
