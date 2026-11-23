// src/db/schema/relations.ts
//
// Purpose: Declares Drizzle ORM relational associations across tenants, organizations, users, RBAC, and subscriptions.
//
// Context: Enables strongly typed relational queries while preserving strict foreign-key ownership within schema core.
//
// Implementation Specs: Drizzle relations() definitions linking tenants, hierarchical organizations, users, roles, memberships, and subscriptions.

import { relations } from 'drizzle-orm';
import {
  tenants, organizations, users, userOidcIdentities, userInvitations, userSessions,
  saasModules, roles, permissions, rolePermissions, organizationMemberships,
  subscriptionPlans, tenantSubscriptions, tenantModuleSubscriptions,
  organizationModuleEntitlements, subscriptionChangeLogs, platformConfigurations,
  apiKeys, webhookEndpoints, auditLogs, notificationChannelConfigs,
  notificationRoutingRules, userNotificationPreferences, notificationDeliveries,
} from './platform-core';

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  organizations: many(organizations),
  users: many(users),
  invitations: many(userInvitations),
  roles: many(roles),
  memberships: many(organizationMemberships),
  subscription: one(tenantSubscriptions, { fields: [tenants.id], references: [tenantSubscriptions.tenantId] }),
  moduleSubscriptions: many(tenantModuleSubscriptions),
  orgEntitlements: many(organizationModuleEntitlements),
  subscriptionChanges: many(subscriptionChangeLogs),
  configurations: many(platformConfigurations),
  apiKeys: many(apiKeys),
  webhooks: many(webhookEndpoints),
  auditLogs: many(auditLogs),
  notificationChannels: many(notificationChannelConfigs),
  notificationRules: many(notificationRoutingRules),
  notificationDeliveries: many(notificationDeliveries),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [organizations.tenantId], references: [tenants.id] }),
  parentOrganization: one(organizations, { fields: [organizations.parentOrgId], references: [organizations.id], relationName: 'org_hierarchy' }),
  childOrganizations: many(organizations, { relationName: 'org_hierarchy' }),
  memberships: many(organizationMemberships),
  moduleEntitlements: many(organizationModuleEntitlements),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  primaryTenant: one(tenants, { fields: [users.primaryTenantId], references: [tenants.id] }),
  oidcIdentities: many(userOidcIdentities),
  sessions: many(userSessions),
  memberships: many(organizationMemberships),
  notificationPreferences: many(userNotificationPreferences),
  notificationDeliveries: many(notificationDeliveries),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePermissions: many(rolePermissions),
  memberships: many(organizationMemberships),
}));

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  module: one(saasModules, { fields: [permissions.moduleCode], references: [saasModules.code] }),
  rolePermissions: many(rolePermissions),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  tenant: one(tenants, { fields: [organizationMemberships.tenantId], references: [tenants.id] }),
  organization: one(organizations, { fields: [organizationMemberships.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMemberships.userId], references: [users.id] }),
  role: one(roles, { fields: [organizationMemberships.roleId], references: [roles.id] }),
}));

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tenantSubscriptions.tenantId], references: [tenants.id] }),
  plan: one(subscriptionPlans, { fields: [tenantSubscriptions.planId], references: [subscriptionPlans.id] }),
  moduleSubscriptions: many(tenantModuleSubscriptions),
  changeLogs: many(subscriptionChangeLogs),
}));
