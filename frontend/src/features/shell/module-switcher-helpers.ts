// frontend/src/features/shell/module-switcher-helpers.ts
/*
Purpose: Pure permission-filtering and organization tree flattening helpers for
the Unified Module Switcher and Graceful Organization Fallback views.

Context: Enforces BR-015 (hide locked add-ons from non-admin staff) and BR-016
(list only user-accessible orgs where the target module is enabled).

Implementation Specs: Pure TypeScript functions shared by React components and
Cucumber.js BDD acceptance tests.
*/

import type {
  LockedModuleAddOn,
  OrganizationSummary,
  OrganizationTreeNode,
} from "@/contracts/shell-auth.schemas";

const ENTITLEMENT_ADMIN_PERMISSIONS = new Set([
  "subscriptions:view",
  "subscriptions:manage",
  "entitlements:edit",
]);

export function hasEntitlementAdminAccess(
  effectivePermissions: readonly string[]
): boolean {
  return effectivePermissions.some((perm) =>
    ENTITLEMENT_ADMIN_PERMISSIONS.has(perm)
  );
}

export function filterVisibleLockedAddOns(
  lockedAddOns: readonly LockedModuleAddOn[],
  effectivePermissions: readonly string[]
): LockedModuleAddOn[] {
  if (!hasEntitlementAdminAccess(effectivePermissions)) {
    return [];
  }
  return [...lockedAddOns];
}

export function flattenEligibleOrganizations(
  roots: readonly OrganizationTreeNode[],
  moduleCode: string
): OrganizationSummary[] {
  const result: OrganizationSummary[] = [];
  const visit = (nodes: readonly OrganizationTreeNode[]) => {
    for (const node of nodes) {
      if (node.organization.enabledModules?.includes(moduleCode)) {
        result.push(node.organization);
      }
      if (node.children.length > 0) {
        visit(node.children);
      }
    }
  };
  visit(roots);
  return result;
}
