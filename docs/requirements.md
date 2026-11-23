# METRix — Platform Core Service
## Functional Requirements, Business Rules & Agile Product Backlog

**Document Type:** Implementation-Ready Requirements Baseline & Agile Product Backlog  
**Product / Service:** METRix — Platform Core Service  
**Primary References:**
1. *Platform Core Service — Figma User Journey & UI Wireframes (v1.0 & v1.1 Unified Module Switcher)*
2. *METRix High-Level Design (`METRix-HLD-Concise-20261122.md`)*
3. *Alexander Cowan — "Your Best Agile User Story" (Persona-driven, outcome-focused, INVEST decomposition)*

**Document Status:** Ready for Stakeholder Review, Estimation, Sprint Planning & BDD Acceptance Testing  
**Last Updated:** 24 November 2026 (Updated with I18N & Future Multi-Language Support Readiness)

---

## 1. Product & Scope Overview

### 1.1 Business Objectives
The **METRix Platform Core Service** provides the centralized multi-tenant administration, authorization, commercial entitlement, configuration, audit, and notification foundation consumed by all METRix ERP business microservices. Its primary objectives are to:
1. Establish strict, verifiable **tenant and organization isolation** across individual businesses (SMBs), multi-subsidiary enterprises, and Chartered Accountant (CA) firms managing multiple client organizations.
2. Delegate user authentication to a **managed OIDC/OAuth 2.0 identity provider** while owning application-level identity relationships, memberships, and fine-grained **Role-Based Access Control (RBAC)**.
3. Govern commercial **product subscriptions and organization-level module entitlements** across independently deployable downstream business services without embedding their internal business workflows.
4. Provide a **unified, scalable application shell** with persistent navigation controls, theme preferences, locale/language readiness, and permission-driven cross-module switching.
5. Deliver enterprise-grade **centralized auditability** and **shared notification orchestration** across service boundaries.

### 1.2 Explicit Scope Boundaries

| Dimension | In Scope (Platform Core Service) | Out of Scope (Owned Elsewhere) |
| :--- | :--- | :--- |
| **Tenancy & Organizations** | Tenant registration, multi-archetype onboarding (SMB, Enterprise, CA Firm), parent/subsidiary and practice/client organization hierarchies, tenant status lifecycle. | Domain-specific client accounting ledgers, tax taxpayer profiles, or HRMS department payroll trees. |
| **Identity & Access** | OIDC/SSO integration settings, user directory, invitation lifecycle, seat quota checks, system/custom RBAC roles, 4-service permission matrix, multi-org memberships, time-bound access, service-level authorization enforcement. | Password storage, credential recovery, MFA challenge UI, and identity token issuance (delegated to managed OIDC provider). |
| **Commercials & Modules** | Subscription plans, module activations, per-organization feature entitlements, seat/org quotas, upgrade/downgrade safeguards, precision-safe proration previews, Unified Module Switcher, and graceful org-level fallback routing. | Internal business workflows of **Tax & Financial Intelligence** (Advance Tax, Income Tax, GST calculations), **Payroll & HRMS** (payroll runs, payslips), or **CA Practice & Accounting** (engagements, reconciliation). Payment gateway checkout and tax invoicing mechanics (see `GAP-01`). |
| **Governance, I18N & Ops** | Platform localization/security policies (timezone, currency, FY, `BCP-47` locale/language preference foundation & future multi-language option), microservice registry visibility, scoped API keys/webhooks, immutable cross-service audit log search/diff/export, notification routing rules, delivery diagnostics, and personal preferences. | Domain-specific calculation audit formulas (owned by Tax service; Platform Core ingests domain audit events), downstream analytics/AI OCR pipelines, and active multi-language translation pack authoring/QA in v1 (deferred to a future phase; see `GAP-13`). |

### 1.3 Key Actors & Expected Outcomes
* **METRix Platform Operators** provision and govern tenants across all customer archetypes, enforce global OIDC/security posture, monitor cross-service health, and inspect platform-wide audit trails.
* **Enterprise & SMB Administrators** manage their internal organizations, invite staff within licensed seat caps, configure custom RBAC roles, manage subscriptions/entitlements, and switch seamlessly into subscribed modules.
* **Chartered Accountant Managing Partners & Staff** onboard and isolate dozens or hundreds of client organizations under a single practice tenant, grant staff selective per-client roles, and switch modules safely without cross-client data leakage.
* **Security & Compliance Auditors** verify immutable cross-service activity histories and exact before/after permission mutations for statutory compliance.

---

## 2. Persona Catalogue

Following Alexander Cowan's persona-driven story discipline, every Epic and Child User Story targets an operational, named persona archetype rather than a generic "user."

| ID | Persona Name & Role | Representative Archetype | Primary Responsibilities | Core Goals & Motivations | Access & Isolation Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PER-01** | **Platform Super Administrator** (e.g., *Rajesh Kapoor*) | METRix Internal Operations | Provision tenants, monitor platform health, configure global OIDC/security/localization policies, manage service registry, audit cross-tenant actions. | Onboard new customers cleanly with zero misconfiguration; maintain security compliance and rapid incident diagnostics across all tenants. | Global Platform scope; explicit Context Switcher (`All Tenants` or scoped single tenant) with mandatory audit logging. |
| **PER-02** | **Enterprise Tenant Administrator** (e.g., *Vikram Desai*) | Multi-Subsidiary Enterprise (*Meridian Infrastructure Group* — HQ + 5 Subsidiaries) | Manage parent/subsidiary orgs, onboard internal employees via Enterprise SSO, govern roles, allocate module entitlements per subsidiary, manage plan upgrades/downgrades. | Maintain centralized cost and access control across subsidiaries while letting teams switch seamlessly between enabled ERP modules. | Full Tenant scope for a single Enterprise tenant and all its child organizations; strictly isolated from other tenants. |
| **PER-03** | **CA Firm Managing Partner** (e.g., *Rohan Kulkarni*) | Chartered Accountant Firm (*Kulkarni, Deshmukh & Associates LLP* — Practice HQ + 48 Client Orgs) | Onboard client entities, assign CA associates to exact client portfolios with distinct roles, enable per-client modules (e.g., Tax for all, Payroll for selected clients), track org/seat quotas. | Scale client onboarding without risking accidental cross-client data exposure; enforce strict staff-to-client access boundaries. | Full Tenant scope for the CA Practice tenant, Practice HQ, and all managed Client Organizations. |
| **PER-04** | **SMB Business Administrator** (e.g., *Arjun Verma*) | Individual Business (*Verma Precision Components Pvt. Ltd.* — 1 Primary Org) | Self-administer a single company workspace, invite small team members, manage active module subscriptions and personal alerts. | Complete admin setup quickly without enterprise hierarchy complexity getting in the way. | Single Tenant + Single Primary Organization scope. |
| **PER-05** | **Scoped Operational / CA Staff Member** (e.g., *Ananya Iyer*, CA Audit Manager) | Multi-Org Practitioner / Department Manager | Operate within assigned organizations and permitted modules (e.g., Tax Reviewer on Client A, Full Manager on Client B, no access to Clients C–Z); switch modules while retaining workspace preferences. | Move rapidly between permitted modules and assigned organizations with clear feedback if a module is unavailable for a chosen client. | Restricted Organization-scoped memberships; zero visibility into unassigned organizations or unsubscribed modules. |
| **PER-06** | **Invited / Activating User** (e.g., *Meera Nair* / *Priya Sharma*) | Newly Invited Staff or External Client Stakeholder | Accept an organization invitation, verify identity through the managed OIDC provider, and land in the authorized workspace. | Activate access swiftly and securely with clear context on who invited them and what role they hold; recover cleanly if an invite link expires. | Pre-activation token scope -> transitions to assigned Org-scoped membership upon OIDC verification. |
| **PER-07** | **Security & Compliance Auditor** | Internal Governance Officer or External Statutory Auditor | Search, filter, inspect before/after mutation diffs, and export immutable audit logs across Platform Core and downstream services. | Independently verify who changed permissions, entitlements, or configs—and trace events to OpenTelemetry correlation IDs—without holding write privileges. | Read-only + Export audit scope (Platform-wide or Tenant/Org-scoped). |

---

## 3. User Journey & Story Map

The story map sequences **11 end-to-end activities** (derived directly from Figma Journeys `J1`–`J11`) into prioritized release slices using thin, independently valuable functional increments, plus an explicit future-extensibility slice for multi-language activation.

### 3.1 Activity Backbone & Epic Mapping

```text
BACKBONE ACTIVITIES (Left -> Right End-to-End Platform Lifecycle)
====================================================================================================
[A1] Auth & Shell    [A2] Tenancy & Orgs   [A3] User Lifecycle   [A4] RBAC Roles      [A5] Org Access
(J1, J11 -> EP-01)   (J2 -> EP-02)         (J3 -> EP-03)         (J4 -> EP-04)        (J5 -> EP-05)
----------------------------------------------------------------------------------------------------
[A6] Entitlements    [A7] Plan Changes     [A8] Platform Config  [A9] Audit Trails    [A10] Notifications
(J6 -> EP-06)        (J7 -> EP-07)         (J8 -> EP-08)         (J9 -> EP-09)        (J10 -> EP-10)
====================================================================================================
```

### 3.2 Prioritized Release Slices

| Release Slice | Priority Goal | Included Child User Stories | Demonstrable End-to-End Value |
| :--- | :--- | :--- | :--- |
| **Slice 1 — Walking Skeleton / Core MVP (P0)** | Secure multi-tenant onboarding, OIDC access, baseline RBAC, org isolation, module entitlements, and core auditability. | `US-01.1`, `US-01.3`, `US-02.1`, `US-02.2`, `US-02.3`, `US-03.1`, `US-03.2`, `US-04.1`, `US-04.2`, `US-04.3`, `US-05.1`, `US-06.1`, `US-06.2`, `US-09.1` | A Platform Admin can onboard an SMB, Enterprise, or CA Firm tenant, create org hierarchies, invite OIDC users within seat limits, assign RBAC roles and per-org memberships, toggle module entitlements, enforce 403 isolation, and search audit logs. |
| **Slice 2 — Unified Shell, Commercial Safeguards & Operations (P1)** | Seamless cross-module navigation, executive visibility, safe upgrades/downgrades, full user/tenant lifecycle, and security config. | `US-01.2`, `US-01.4`, `US-01.5`, `US-02.4`, `US-03.3`, `US-05.2`, `US-07.1`, `US-07.2`, `US-08.1`, `US-09.2`, `US-10.1` | Users switch across permitted METRix modules preserving org context, sidebar pin state, and theme (with graceful org fallback); admins manage plan changes with proration & downgrade blockers, suspend tenants/users, inspect JSON audit diffs, configure OIDC/localization policies, and route alerts. |
| **Slice 3 — Operational Diagnostics & Self-Service Polish (P2)** | Integration governance, asynchronous delivery diagnostics, and personalized alert ergonomics. | `US-08.2`, `US-10.2`, `US-10.3` | Admins manage scoped API keys/outbound webhooks, inspect service registry health, retry failed asynchronous notifications, and customize personal digest schedules. |
| **Future Slice — Multi-Language & Global I18N Expansion (P3 / Future)** | Activate multiple UI languages on top of the I18N-ready foundation built in Slices 1–2. | `US-08.3` | Platform Admins enable additional language packs (e.g., regional Indian or international locales); Tenant Admins set default tenant languages and users select their preferred display language across all METRix modules without breaking canonical audit/API identifiers. |

---

## 4. Functional Requirements

Every functional requirement is uniquely identified, testable, and traceable to Figma journeys and HLD capabilities. Visual styling choices are excluded unless they encode required behavioral usability.

### 4.1 Authentication, Workspace Shell & Cross-Module Navigation (`EP-01`)
* **FR-CORE-001 (Delegated OIDC Authentication):** The system shall delegate user authentication to the configured managed OIDC/OAuth 2.0 identity provider, supporting optional tenant workspace identifier routing for Enterprise SSO and never storing end-user passwords in Platform Core.
* **FR-CORE-002 (Multi-Tenant Workspace Selection):** After successful OIDC token exchange, if the authenticated identity holds active memberships across multiple tenants, the system shall present a workspace selector displaying each tenant and the user's primary role before loading the portal, with an option to remember the last selected workspace.
* **FR-CORE-003 (Platform Executive Dashboard):** The system shall display role-scoped summary metrics (active tenants by archetype, provisioned organizations, active/pending users with MFA status, and active module entitlements), a filterable recent tenant activity summary, a high-priority governance alert feed, and recent high-risk audit events.
* **FR-CORE-004 (Collapsible & Pinnable Left Navigation):** The system shall provide a collapsible left navigation menu that defaults to hidden on first session, opens on demand as an overlay without shifting main workspace content, supports explicit Pin (docked layout with content reflow) and Unpin (return to floating overlay) toggling with distinct visual state indicators, and persists the user's pin preference across sessions.
* **FR-CORE-005 (Responsive Navigation Override):** On viewports narrower than $1024\text{ px}$, the system shall temporarily override a pinned navigation state to floating overlay mode to preserve content usability, and automatically restore the persisted pinned preference when returning to viewports $\ge 1024\text{ px}$.
* **FR-CORE-006 (Appearance Mode Selection):** The system shall provide a compact collapsed appearance control displaying only the active mode icon (Light, Dark, or System), expanding to allow selection between Light, Dark, and System (OS-synchronized) themes, and persisting the user's preference across sessions and modules.
* **FR-CORE-007 (Global Top Bar Context & Command Search):** The system shall provide a persistent top navigation bar exposing the navigation trigger, Unified Module Switcher, Tenant/Organization Context Switcher, route breadcrumbs, global command search (`Cmd/Ctrl+K`), appearance control, notification feed indicator, and user profile menu.
* **FR-CORE-008 (Permission-Driven Unified Module Switcher):** The system shall provide a Unified Module Switcher listing the currently active module, other modules permitted for the user's role and tenant subscription, and—for administrative roles only—unsubscribed add-on modules marked as locked with a direct path to subscription management.
* **FR-CORE-009 (Cross-Module State Continuity):** When a user switches between Platform Core and an enabled downstream METRix module (Tax & Financial Intelligence, Payroll & HRMS, or CA Practice & Accounting), the system shall preserve the active tenant/organization context, sidebar pin preference, appearance preference, and resolved user locale preference.
* **FR-CORE-010 (Graceful Organization-Level Module Fallback):** When a user holds role-level access to a module subscribed by the tenant, but switches to that module while an organization where the module is disabled is selected, the system shall display a non-destructive fallback banner rather than a generic 403 error, listing eligible organizations in the same tenant for one-click switching and (for authorized admins) a direct link to enable the module entitlement.

### 4.2 Tenant & Organization Management (`EP-02`)
* **FR-CORE-011 (Tenants Directory):** The system shall provide a searchable, sortable, and faceted-filterable tenants directory (filtering by customer archetype, subscription status, and subscribed modules) supporting CSV export of the filtered view for authorized administrators.
* **FR-CORE-012 (Multi-Archetype Tenant Onboarding):** The system shall support a guided multi-step tenant registration workflow accommodating three customer archetypes—**Individual Business (SMB)**, **Enterprise (Multi-Subsidiary)**, and **Chartered Accountant Firm (Practice + Managed Clients)**—capturing legal entity identity, unique tenant slug, primary region, base currency, financial year cycle, initial organization setup, primary administrator OIDC provisioning mode, and initial subscription/module selection.
* **FR-CORE-013 (Initial Organization Setup by Archetype):** During onboarding, the system shall automatically create a single Primary Organization for SMB tenants, allow defining a Parent HQ plus subsidiary organizations (with statutory metadata such as GSTIN/CIN) for Enterprise tenants, and create a Practice HQ plus quick-add or bulk CSV import of Client Organizations for CA Firm tenants.
* **FR-CORE-014 (Organization Hierarchy Administration):** The system shall provide a hierarchical view of a tenant's organizations (root tenant, HQ, subsidiaries, or managed client orgs) allowing authorized admins to add new organizations within plan quotas and inspect organization overview, members, enabled modules, and audit history.
* **FR-CORE-015 (Tenant Status Lifecycle):** The system shall allow Platform Super Administrators to suspend or reactivate a tenant, requiring explicit high-impact confirmation and immediately revoking or restoring downstream module and portal access across all organizations belonging to that tenant.

### 4.3 User Management & Invitations (`EP-03`)
* **FR-CORE-016 (Users & Invitations Directory):** The system shall provide a unified directory segmented into All Users, Pending Invitations, and Suspended/Deactivated users, displaying identity provider type, tenant/organization scope, assigned roles, last activity timestamp, and lifecycle status.
* **FR-CORE-017 (Multi-User Invitation with Quota Check):** The system shall allow authorized administrators to invite one or more users by email, assign target organizations and per-organization roles, validate the invitation count against licensed tenant seat quotas in real time before dispatch, and generate time-limited OIDC activation invitations.
* **FR-CORE-018 (OIDC Invitation Activation & Expiry Handling):** The system shall allow an invited user to review the inviting tenant, assigned role, and organization scope via an invitation token link, complete identity verification through the managed OIDC provider, transition to `Active` status, and request a fresh invitation if the token is expired or invalid.
* **FR-CORE-019 (User Lifecycle Controls):** The system shall allow authorized administrators to resend or revoke pending invitations, force-revoke active OIDC sessions for a user, and suspend or reactivate user accounts with immediate authorization effect.

### 4.4 Role-Based Access Control (`EP-04`)
* **FR-CORE-020 (System & Custom Role Library):** The system shall maintain read-only System Default Roles (e.g., Platform Super Admin, Tenant Admin, CA Partner, Read-Only Auditor) that can be inspected and cloned, and allow authorized administrators to create, edit, duplicate, and delete Custom Roles scoped to Platform, Tenant, or Organization level.
* **FR-CORE-021 (Cross-Service Permission Matrix):** The system shall provide a structured permission matrix grouped by the four METRix HLD service domains (**Platform Core**, **Tax & Financial Intelligence**, **Payroll & HRMS**, **CA Practice & Accounting**) with granular action controls (`View`, `Create`, `Edit`, `Delete`, `Approve/Export`), tri-state group selection, and privilege escalation warnings for sensitive administrative permissions.
* **FR-CORE-022 (Entitlement-Gated Permission Visibility):** Within the permission matrix, permissions belonging to a downstream service that is not subscribed for the active tenant/organization context shall be clearly marked as locked/entitlement-gated and prevented from granting effective access until the module is subscribed.
* **FR-CORE-023 (Service-Level Authorization & Access-Denied Feedback):** The system shall enforce RBAC checks on every Platform Core API endpoint and propagate tenant, organization, role, and entitlement claims to downstream services; unauthorized actions shall return HTTP `403` and surface clear access-denied feedback identifying the missing permission code and recovery path.

### 4.5 Organization Memberships & Scoped Isolation (`EP-05`)
* **FR-CORE-024 (Dual-Pivot Membership Administration):** The system shall allow administrators to manage organization memberships from either an **Organization-centric pivot** (all users authorized on a chosen subsidiary or client org) or a **User-centric pivot** (all organizations authorized for a chosen staff member, highlighting isolated/unassigned client orgs).
* **FR-CORE-025 (Multi-Org Role Mapping & Time-Bound Access):** The system shall allow assigning a single user to multiple organizations within a tenant with distinct roles per organization and an optional access expiration date (after which membership automatically revokes).
* **FR-CORE-026 (Effective Permissions Inspector):** The system shall compute and display a read-only Effective Permissions view for any user-organization pair representing the intersection of the user's assigned role permissions and the organization's active module entitlements.

### 4.6 Product Subscriptions & Module Entitlements (`EP-06` & `EP-07`)
* **FR-CORE-027 (Subscription & Quota Overview):** The system shall display the tenant's active plan tier, billing cycle, renewal date, exact contract value (using precision-safe decimal representation), seat utilization, organization utilization, and per-service entitlement cards for Tax & Financial Intelligence, Payroll & HRMS, and CA Practice & Accounting, with an extensible structure for future modules.
* **FR-CORE-028 (Organization-Level Entitlement Matrix):** The system shall provide an Organization-by-Module entitlement matrix allowing authorized administrators to enable or disable subscribed modules and allocate seat caps per organization (supporting selective per-client enablement for CA Firms).
* **FR-CORE-029 (Plan Upgrades, Add-Ons & Proration Preview):** The system shall allow authorized administrators to compare plan tiers, add microservice modules, adjust seat/organization packs, choose effective timing (Immediate vs. End of Billing Cycle), and view exact backend-computed proration figures (calculated via `Decimal.js` / `NUMERIC`, never floating-point arithmetic) prior to confirmation.
* **FR-CORE-030 (Downgrade Impact Validation & Safeguards):** Before executing a plan downgrade, quota reduction, or module removal, the system shall evaluate active usage and enforce hard blockers (preventing reduction below active users or organizations), display soft impact warnings (affected users/orgs and archival behavior), and require explicit typed/checkbox confirmation.

### 4.7 Platform Configuration & I18N (`EP-08`)
* **FR-CORE-031 (General, Localization, OIDC/SSO & Tenant Quota Configuration):** The system shall allow Platform Super Administrators to view and update global localization/FY defaults (including platform display name, default `BCP-47` locale defaulting to `en-IN`, default timezone, date/number formats, and default FY cycle), managed OIDC/SSO parameters (issuer URL, masked client ID, redirect URIs, MFA enforcement, idle timeout, concurrent session policy), default trial duration, quota enforcement mode, and audit log retention periods, with unsaved-change protection and high-impact confirmation for security edits.
* **FR-CORE-032 (Service Registry & Global Feature Flags):** The system shall display read-only operational health and API contract version status for all registered business microservices and allow authorized Platform Super Administrators to manage global feature flag states.
* **FR-CORE-033 (API Keys & Outbound Webhooks):** The system shall allow authorized administrators to generate, copy once (masked thereafter), rotate, and revoke scoped integration API keys and configure outbound webhook endpoints for platform event consumers.
* **FR-CORE-040 (Future Multi-Language Support & Locale Extensibility):** The system shall be architected to support multiple UI languages in a future release using standard `BCP-47` locale identifiers (`en-IN` initial default) and an extensible preference hierarchy (**Platform Default -> Tenant Default -> User Profile Override**). When additional language packs are enabled via platform configuration/feature flags, administrators shall be able to select a tenant default language and individual users shall be able to choose their preferred display language in their profile/shell preferences, propagating the resolved locale across Platform Core, notification templates, and downstream METRix modules.

### 4.8 Centralized Audit Logs (`EP-09`)
* **FR-CORE-034 (Centralized Cross-Service Audit Ingestion & Search):** The system shall record immutable audit events for all Platform Core state mutations and ingest domain audit events from downstream services, supporting full-text search (actor, target ID, correlation/trace ID), date-range selection, and multi-select filtering by Tenant, Service Source, Action Category, and Outcome (`Success`, `Denied`, `Failed`).
* **FR-CORE-035 (Audit Event Inspection & Structured Diff):** Selecting an audit event shall display complete immutable metadata (Event ID, OpenTelemetry Trace ID, Actor OIDC Subject ID, Tenant/Org ID, IP, User Agent, Timestamp) and a structured before/after state diff with raw JSON copy capability.
* **FR-CORE-036 (Filtered Audit Export):** The system shall allow authorized roles with `audit.logs:export` permission to export filtered audit log sets in CSV or JSON format, while recording the export itself as an audit event.

### 4.9 Notification Orchestration & Preferences (`EP-10`)
* **FR-CORE-037 (Notification Channel & Event Routing Administration):** The system shall allow authorized administrators to view channel provider statuses (In-App Feed, Transactional Email, Outbound Webhook), configure an Event-by-Channel routing matrix mapped to recipient roles, preview templates, and trigger test dispatches.
* **FR-CORE-038 (Asynchronous Delivery Logs & Retry):** The system shall log notification dispatch outcomes (`Delivered`, `Bounced`, `Retrying`, `Failed`) processed via asynchronous job queues and allow authorized administrators to trigger manual retries for failed deliveries.
* **FR-CORE-039 (Personal Notification Preferences):** The system shall allow every authenticated administrator to customize personal alert preferences by category (`Security & Access`, `Tenancy & Onboarding`, `Billing & Quotas`, `System Alerts`), select delivery cadence (Real-time vs. Daily Digest), and configure quiet/mute windows for non-critical alerts without allowing muting of mandatory security alerts.

---

## 5. Business Rules & Validation Catalogue

| Rule ID | Category | Rule Statement & Constraint | Expected System Response on Violation / Trigger |
| :--- | :--- | :--- | :--- |
| **BR-001** | Tenancy | Every tenant slug (subdomain identifier) must be globally unique, lowercase alphanumeric with hyphens, $3$–$63$ characters, and immutable after provisioning (unless overridden via `GAP-04`). | Reject creation with HTTP `409 Conflict` and inline validation message citing the conflicting slug. |
| **BR-002** | Tenancy | Every Tenant must have at least one Organization (`Primary Org` for SMB, `Parent HQ` for Enterprise, `Practice HQ` for CA Firm) and at least one active Tenant/Practice Administrator. | Block deletion or deactivation of the last remaining Organization or last active Tenant Administrator with an explanatory blocking alert. |
| **BR-003** | Multi-Tenancy | Strict tenant and organization data isolation must be enforced at the service and database query layers; no query, search, or dropdown may leak metadata belonging to an unauthorized tenant or unassigned organization. | Enforce server-side tenant/org scoping on all endpoints; return `403 Forbidden` (or `404 Not Found` to avoid resource enumeration) on cross-tenant access attempts and log a `Denied` audit event. |
| **BR-004** | Identity | Platform Core must not store plaintext or hashed user passwords; authentication must be completed via the managed OIDC/OAuth 2.0 provider. | Reject any non-OIDC credential submission; redirect unauthenticated sessions to the configured OIDC authorization endpoint. |
| **BR-005** | Invitations | Pending invitations reserve a licensed seat slot (or are evaluated against seat caps per `GAP-05`) and expire automatically after a configurable TTL (default $7$ days). | Display real-time seat quota calculation in the invite workflow; block dispatch if total `(Active Users + Pending Invites + New Invites) > Licensed Seat Cap` unless soft-quota overage is configured. Expired tokens display an expiry screen with one-click re-request. |
| **BR-006** | Invitations | An email address cannot hold duplicate active invitations for the same tenant simultaneously. | Flag duplicate or already-active emails inline during invite submission without failing valid rows, or prompt to edit existing user memberships instead. |
| **BR-007** | RBAC | System Default Roles are immutable; they cannot be edited or deleted, only viewed or cloned into a Custom Role. | Render System Default Roles read-only with a `Clone Role` action; reject API `PUT`/`DELETE` calls against system roles with `403`/`409`. |
| **BR-008** | RBAC | A Custom Role currently assigned to one or more users cannot be deleted until all assigned users are reassigned to another role. | Block deletion with a validation message listing the count of affected users and a link to filter users by that role. |
| **BR-009** | RBAC | Effective access for any action equals: `User Active Status` AND `Tenant Active Status` AND `Organization Membership Active (not expired)` AND `Role Permission Granted` AND `Organization Module Entitlement Active`. | Deny access if any link in the authorization chain evaluates false; compute and display the exact evaluated intersection in the Effective Permissions Inspector. |
| **BR-010** | RBAC | Assigning high-risk permissions (e.g., `roles:write`, `subscriptions:manage`, `config:security.write`, `tenants:suspend`) must trigger a privilege escalation warning and emit a high-severity audit event and security alert. | Display an inline privilege warning banner prior to saving; emit `role.privilege.escalated` audit and notification events upon commit. |
| **BR-011** | Memberships | Time-bound organization memberships must automatically cease granting access at the configured expiry timestamp (inclusive end-of-day in tenant timezone or UTC per `GAP-07`). | Scheduled job and real-time token/policy evaluation reject expired memberships immediately and transition status to `Expired`. |
| **BR-012** | Commercials | All monetary values, contract totals, and proration credits/charges must be calculated on the backend using `Decimal.js` and persisted using PostgreSQL `NUMERIC` (never IEEE-754 floating-point arithmetic). | Reject client-submitted price totals; always recompute authoritative decimal amounts server-side with deterministic rounding. |
| **BR-013** | Commercials | A tenant cannot downgrade to a plan tier or quota whose seat limit is less than current active users, or whose organization limit is less than current active organizations. | Present a **Hard Blocker** in the Downgrade Safeguard Dialog specifying exact excess counts (e.g., *"Deactivate 4 users before reducing cap to 20"*) and disable the confirmation action until resolved. |
| **BR-014** | Commercials | Disabling a subscribed module (at tenant or organization level) revokes active access immediately (or at cycle end if scheduled) while preserving historical domain records per statutory retention policy. | Present a **Soft Impact Warning** detailing exact affected user/org counts and require explicit typed tenant-name and checkbox acknowledgement before execution. |
| **BR-015** | Unified Shell | Non-admin users must not see unsubscribed/gated add-on modules in the Unified Module Switcher (to minimize cognitive load and avoid dead ends); Tenant/Platform Admins see gated add-ons clearly marked as locked with a route to Subscriptions. | Filter switcher payload server-side based on user role and tenant entitlements. |
| **BR-016** | Unified Shell | Switching to a module enabled on the tenant but disabled on the currently active organization must trigger the Graceful Organization Fallback flow instead of a dead-end `403` error. | Render the fallback banner with the tenant's eligible organizations list while keeping the user's session, sidebar pin preference, and theme intact. |
| **BR-017** | Shell Persistence | User preferences for Left Navigation pin state (`pinned` vs. `floating`), Appearance (`light`, `dark`, `system`), and Display Locale (`BCP-47`, when multi-language is enabled) must persist across sessions and across modules per user profile. | Store preferences in user profile state (with local cache for flicker-free hydration) and apply consistently across Platform Core and downstream module shells. |
| **BR-018** | Configuration | Modifying security-critical platform configurations (OIDC Issuer, Redirect URIs, MFA policy, Session Timeout) requires explicit confirmation and dirty-form protection against accidental navigation loss. | Show unsaved-change guard bar on edits and require confirmation modal before committing security-domain settings. |
| **BR-019** | Audit | Audit log records are strictly append-only and immutable; no role—including Platform Super Admin—may update or delete audit entries prior to automated statutory retention expiry. | Enforce append-only database permissions; reject any mutation/delete API requests on audit records. |
| **BR-020** | Audit | Every state-changing Platform Core operation and every `403` authorization denial must emit a structured audit record containing Actor ID, Tenant/Org ID, Service Source, Action, Outcome, Timestamp, and OpenTelemetry Trace ID, using transactional outbox where cross-service events apply. | Commit audit event atomically with the local database transaction (or transactional outbox) so mutations cannot succeed without an audit trail. |
| **BR-021** | Notifications | Critical security alerts (e.g., OIDC Auth Anomaly, Tenant Suspension, Role Privilege Escalation) cannot be muted by personal quiet-hours or digest settings. | Lock critical security notification rows as mandatory in Personal Preferences and always dispatch in real time. |
| **BR-022** | API Keys | Scoped API keys are displayed in full only once upon creation and stored only as cryptographic hashes; subsequent views show a masked prefix/suffix only. | Display one-time copy dialog at creation; mask key value in all directory listings and audit diffs. |
| **BR-023** | Internationalisation (I18N) | All locale and language selections must use valid, platform-enabled `BCP-47` locale tags (default `en-IN`). Active display locale resolves strictly as `User Profile Locale -> Tenant Default Locale -> Platform Default (en-IN)`. Missing translation keys must fall back cleanly to `en-IN` without displaying raw keys; canonical RBAC permission codes, API enum values, and audit action codes must remain language-neutral (English). | Reject unsupported or malformed `BCP-47` tags with HTTP `422 Unprocessable Entity`; never surface untranslated raw key paths (e.g., `nav.tenants.title`) to end users. |

---

## 6. Agile Product Backlog

Organized hierarchically as **Epic -> Child User Stories -> Acceptance Criteria -> Illustrative BDD Scenarios**. Acceptance criteria are binding, objective verification conditions; illustrative BDD scenarios are separate Gherkin examples validating business behavior.

---

### Epic `EP-01`: Delegated Authentication, Workspace Context & Unified App Shell
> **Epic Narrative:** As a **METRix Platform User (`PER-01`–`PER-05`)**, I want to authenticate securely through our managed OIDC provider, select my authorized workspace, and navigate seamlessly across Platform Core and enabled METRix modules with consistent navigation, appearance, and locale preferences, so that I can work efficiently across organizations without losing context or encountering authorization dead ends.

---

#### Story `US-01.1`: Delegated OIDC Sign-In & Multi-Tenant Workspace Selection
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J1` (Screen 1.1) | **Linked FRs/BRs:** `FR-CORE-001`, `FR-CORE-002`, `BR-003`, `BR-004`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **Platform Super Administrator (`PER-01`)**, I want to sign in via my organization's managed OIDC provider and choose my active tenant workspace when I belong to multiple tenants, so that I can access the exact tenant environment I intend to administer without managing separate passwords.

**Acceptance Criteria:**
1. Unauthenticated requests to any protected Platform Core route redirect to the OIDC sign-in flow without exposing tenant data.
2. Users may optionally supply a tenant workspace identifier or work email to route authentication to an organization-specific Enterprise SSO IdP configured in the managed OIDC provider.
3. Upon valid OIDC callback and token verification, if the user holds active access to exactly one tenant, the system lands directly in that tenant's default workspace.
4. If the user holds active access to two or more tenants, the system displays a searchable workspace selector listing each accessible tenant and the user's assigned role, plus an option to remember the last selected workspace.
5. Suspended users or users belonging only to suspended tenants are denied entry after OIDC verification with an informative account-suspended message, and a `Denied` authentication audit event is recorded.
6. Failed or cancelled OIDC callbacks display a non-technical error state with a retry action and do not establish a partial session.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Delegated OIDC Sign-In and Workspace Context Selection

  Scenario: BDD-01.1.1 Single-tenant administrator signs in via managed OIDC
    Given "vikram@meridian.in" has an active membership solely in tenant "Meridian Infrastructure Group"
    When Vikram completes authentication with the managed OIDC provider
    Then Platform Core establishes a tenant-scoped session for "Meridian Infrastructure Group"
    And Vikram lands directly on the Platform Core dashboard without seeing the workspace selector
    And an audit event "auth.session.created" with outcome "Success" is recorded

  Scenario: BDD-01.1.2 Multi-tenant administrator selects a specific tenant workspace
    Given "rohan@kda-llp.in" holds active memberships in "Kulkarni, Deshmukh & Associates LLP" and "KDA Advisory Demo"
    When Rohan completes authentication with the managed OIDC provider
    Then Platform Core presents the workspace selector displaying both tenants and Rohan's role in each
    When Rohan selects "Kulkarni, Deshmukh & Associates LLP" and enables "Remember last workspace"
    Then Platform Core establishes a session scoped to "Kulkarni, Deshmukh & Associates LLP"
    And persists Rohan's last workspace preference

  Scenario: BDD-01.1.3 User belonging to a suspended tenant is denied access
    Given tenant "Zenith Advisory Services" has status "Suspended"
    And "admin@zenith.in" belongs only to "Zenith Advisory Services"
    When "admin@zenith.in" completes OIDC authentication
    Then Platform Core denies session creation and informs the user that the workspace is suspended
    And records an audit event "auth.session.denied" with outcome "Denied"
```

---

#### Story `US-01.2`: Platform Core Executive Health Dashboard & Governance Feed
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J1` (Screen 1.2) | **Linked FRs/BRs:** `FR-CORE-003`, `BR-003`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to view a consolidated executive dashboard of tenant health, organization counts, seat/module utilization, quota alerts, and recent high-risk audit events, so that I can proactively spot capacity bottlenecks or security anomalies before customers are disrupted.

**Acceptance Criteria:**
1. The dashboard displays four summary metrics scoped to the active context (global for Platform Super Admin; single-tenant for Tenant Admin): Active Tenants (with archetype breakdown), Provisioned Organizations, Active Platform Users (with pending invite count and MFA adoption percentage), and Active Module Entitlements by service.
2. The recent tenant activity table supports filtering by Customer Type (`Individual Business`, `Enterprise`, `CA Firm`) and Status (`Active`, `Trial`, `Suspended`) and displays seat utilization against licensed caps.
3. The governance alert feed surfaces actionable warnings (such as tenants reaching $\ge 90\%$ of seat or organization quotas, pending upgrade requests, and webhook sync retries) with navigation to the relevant management view.
4. A compact recent high-risk audit events strip displays the latest 5 critical governance mutations and links directly to the filtered Audit Log Explorer.
5. While metrics and tables hydrate, matching loading skeleton states are displayed; if a non-critical widget fails to load, an inline retry error state renders without crashing the full dashboard.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Platform Core Executive Health Dashboard

  Scenario: BDD-01.2.1 Platform Super Admin views global tenant health and quota alerts
    Given Rajesh Kapoor is signed in as "Platform Super Admin" with context "All Tenants"
    And "Kulkarni, Deshmukh & Associates LLP" uses 48 of 50 client organizations
    When Rajesh views the Platform Core Dashboard
    Then Rajesh sees aggregated counts for Active Tenants, Provisioned Organizations, Active Users, and Module Entitlements
    And the governance alert feed highlights that "Kulkarni, Deshmukh & Associates LLP" has reached 96% of its client organization quota

  Scenario: BDD-01.2.2 Tenant Admin sees strictly tenant-isolated dashboard data
    Given Vikram Desai is signed in as "Tenant Admin" for "Meridian Infrastructure Group"
    When Vikram views the Platform Core Dashboard
    Then all KPI metrics, activity rows, and alerts reflect only "Meridian Infrastructure Group"
    And zero data from "Kulkarni, Deshmukh & Associates LLP" or "Verma Precision Components" is returned by the API
```

---

#### Story `US-01.3`: Collapsible & Pinnable Navigation Persistence and Appearance Preference
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J1` / Shell States (Hidden, Overlay, Pinned, Pin Up/Down, Light/Dark/System) | **Linked FRs/BRs:** `FR-CORE-004`, `FR-CORE-005`, `FR-CORE-006`, `FR-CORE-007`, `BR-017`
* **User Story:** As a **Platform Super Administrator (`PER-01`)** or **CA Firm Managing Partner (`PER-03`)**, I want to toggle the left navigation between a zero-shift floating overlay and a persistent pinned rail (using clear Pin Up/Pin Down controls) and choose between Light, Dark, and System appearance modes, so that I can maximize screen density for wide enterprise tables while keeping my preferred workspace layout across sessions.

**Acceptance Criteria:**
1. On a user's first login (no saved preference), the left navigation menu starts hidden with the navigation trigger visible in the top bar.
2. Activating the navigation trigger (click or `Cmd/Ctrl+B`) opens the navigation menu as a floating overlay without shifting or reflowing underlying main content; clicking outside, pressing `Esc`, or selecting a route dismisses the overlay.
3. Activating the Pin control (`Pin Up` -> `Pin Down`, or `Cmd/Ctrl+Shift+P`) docks the navigation menu persistently alongside the workspace, reflowing main content width accordingly, and saves the pinned preference to the user's profile.
4. Activating the Unpin control (`Pin Down` -> `Pin Up`) reverts the menu to floating overlay behavior and updates the persisted preference.
5. On viewports $< 1024\text{ px}$, a pinned menu temporarily behaves as a floating overlay without overwriting the saved desktop pin preference, restoring the pinned layout when the viewport returns to $\ge 1024\text{ px}$.
6. The collapsed appearance switcher displays only the icon representing the active preference (`Sun` for Light, `Moon` for Dark, `Monitor` for System); expanding it lets the user choose `Light`, `Dark`, or `System` (synchronizing dynamically with OS color-scheme preference), and persists the choice across sessions.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Persistent Navigation Layout and Appearance Preferences

  Scenario: BDD-01.3.1 User pins navigation and retains pinned layout across routes and sessions
    Given Ananya Iyer logs in for the first time on a 1440px desktop viewport
    Then the left navigation menu is hidden by default
    When Ananya opens the floating navigation overlay and activates the Pin control
    Then the navigation menu docks persistently and displays the "Pin Down" state
    And when Ananya navigates to "Organizations" and later starts a new session on desktop
    Then the navigation menu remains pinned automatically

  Scenario: BDD-01.3.2 Responsive viewport temporarily overrides pinned navigation without losing preference
    Given Ananya has saved her navigation preference as "Pinned"
    When Ananya resizes the browser viewport to 900px width
    Then the navigation menu switches to floating overlay behavior so the data table remains readable
    When Ananya returns the viewport to 1440px width
    Then the navigation menu restores to its saved "Pinned" state

  Scenario: BDD-01.3.3 User selects System appearance mode from the icon-only theme switcher
    Given Vikram's appearance preference is "Light" and the top bar shows only the Sun icon
    When Vikram opens the appearance switcher and selects "System" while his OS is in Dark mode
    Then the application switches to Dark mode tokens immediately
    And the collapsed top bar button displays only the Monitor icon
    And the "System" preference persists on next login
```

---

#### Story `US-01.4`: Permission-Driven Unified Cross-Module Switching & Context Continuity
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J11` (Unified Module Switcher Popover & Tax Target Shell) | **Linked FRs/BRs:** `FR-CORE-008`, `FR-CORE-009`, `BR-009`, `BR-015`, `BR-017`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)** or **CA Staff Member (`PER-05`)**, I want to switch seamlessly between Platform Core and my permitted METRix business modules from a single top-bar switcher while keeping my active organization, sidebar pin state, theme, and display locale intact, so that I can move between administrative governance and operational work without re-authenticating or re-selecting my client context.

**Acceptance Criteria:**
1. The Unified Module Switcher trigger resides in the top navigation bar adjacent to the navigation trigger and Tenant/Organization Context Switcher and displays the active module indicator.
2. Opening the switcher clearly distinguishes: (a) the current active module, (b) other modules active and permitted for the user's role, and (c) for Tenant/Platform Admin roles only, unsubscribed add-on modules marked with a lock indicator and a direct link to Subscriptions.
3. Non-admin roles (`PER-05`) do not see unsubscribed/gated add-on modules in the switcher.
4. Selecting a permitted, enabled module (e.g., switching from Platform Core to Tax & Financial Intelligence) transitions to that module's workspace while preserving the active tenant/organization context, sidebar pin preference, Light/Dark/System theme preference, and resolved user locale.
5. Switching back from a downstream module to Platform Core preserves the same context and layout preferences.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Permission-Driven Unified Cross-Module Switching

  Scenario: BDD-01.4.1 Admin switches from Platform Core to Tax & Financial preserving context and Dark theme
    Given Vikram Desai is in "Platform Core" for organization "Meridian Infra HQ" with Pinned sidebar and "Dark" theme
    And "Tax & Financial Intelligence" is enabled for "Meridian Infra HQ"
    When Vikram opens the Unified Module Switcher and selects "Tax & Financial Intelligence"
    Then the portal transitions to the "Tax & Financial Intelligence" shell
    And the active organization remains "Meridian Infra HQ"
    And the left navigation remains pinned and the theme remains "Dark"

  Scenario: BDD-01.4.2 Non-admin staff member does not see unsubscribed add-on modules
    Given tenant "Meridian Infrastructure Group" is not subscribed to "CA Practice & Accounting"
    And Ananya Iyer has a non-admin operational role
    When Ananya opens the Unified Module Switcher
    Then "CA Practice & Accounting" is not displayed in the switcher list

  Scenario: BDD-01.4.3 Tenant Admin sees locked add-on module and navigates to unlock it
    Given tenant "Meridian Infrastructure Group" is not subscribed to "CA Practice & Accounting"
    When Tenant Admin Vikram opens the Unified Module Switcher
    Then "CA Practice & Accounting" appears under Gated Add-On Modules with a lock indicator
    When Vikram selects the "Unlock" action
    Then Vikram is routed to the tenant's Product Subscriptions view
```

---

#### Story `US-01.5`: Graceful Organization-Level Module Fallback Routing
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J11` (Screen 5.3 Org-Disabled Fallback Banner) | **Linked FRs/BRs:** `FR-CORE-010`, `BR-003`, `BR-016`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)** or **CA Staff Member (`PER-05`)**, I want to receive clear, actionable recovery options when I switch to a module that is disabled on my currently selected organization, so that I can immediately jump to an enabled organization or update entitlements instead of hitting a confusing access-denied dead end.

**Acceptance Criteria:**
1. When a user holds tenant/role permission for a module, but invokes it while an organization without that module entitlement is selected, the system displays a non-destructive warning banner stating the exact module name and selected organization.
2. The fallback screen lists only the organizations within the current tenant for which both (a) the user has an active membership and (b) the target module is enabled, allowing one-click switching into any listed organization.
3. If the user also holds `subscriptions:manage` / `entitlements:write` permission, the banner displays an action to open the Platform Core Per-Org Entitlement Matrix pre-focused on the disabled organization.
4. If the user does not hold entitlement management permission, the admin-only enablement CTA is hidden.
5. The user's tenant session, pinned navigation state, and appearance preference remain unchanged throughout the fallback flow.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Graceful Organization-Level Module Fallback

  Scenario: BDD-01.5.1 Admin switches to Payroll while an unentitled subsidiary is selected
    Given "Payroll & HRMS" is enabled on "Meridian Infra HQ" and disabled on "Meridian Energy LLP"
    And Tenant Admin Vikram currently has "Meridian Energy LLP" selected
    When Vikram selects "Payroll & HRMS" in the Unified Module Switcher
    Then the system displays the graceful fallback banner stating Payroll is not enabled for "Meridian Energy LLP"
    And displays "Meridian Infra HQ" as a one-click switchable organization
    And displays a "Manage Entitlements in Core" action

  Scenario: BDD-01.5.2 Non-admin staff sees only their authorized enabled client orgs in fallback
    Given CA Associate Ananya has access to "Apex Textiles" (Payroll enabled) and "Meridian Energy LLP" (Payroll disabled), but no access to "Roads Pvt Ltd" (Payroll enabled)
    And Ananya has "Meridian Energy LLP" selected
    When Ananya switches to "Payroll & HRMS"
    Then the fallback list displays "Apex Textiles" and omits "Roads Pvt Ltd"
    And the "Manage Entitlements in Core" action is not displayed
```

---

### Epic `EP-02`: Multi-Tenant Registration, Onboarding & Organization Hierarchy
> **Epic Narrative:** As a **Platform Super Administrator (`PER-01`)**, **Enterprise Tenant Admin (`PER-02`)**, or **CA Firm Managing Partner (`PER-03`)**, I want to register new tenants across SMB, Enterprise, and CA Firm archetypes and manage their organization hierarchies and lifecycle states, so that every customer begins operations with accurate legal structure and strict data boundaries.

---

#### Story `US-02.1`: Searchable & Filterable Tenants Directory
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J2` (Screen 2.1) | **Linked FRs/BRs:** `FR-CORE-011`, `BR-003`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to search, filter, and sort all provisioned tenants by archetype, status, and subscribed modules, so that I can locate customer accounts rapidly during support, onboarding, or capacity reviews.

**Acceptance Criteria:**
1. The Tenants Directory displays Tenant ID, Legal Name, Customer Type (`SMB`, `Enterprise`, `CA Firm`), Organization count, Subscribed Modules, Seat Utilization (`used / cap`), and Lifecycle Status (`Active`, `Trial`, `Suspended`).
2. Full-text search matches Tenant ID, Legal Name, and Tenant Slug with debounced server-side pagination.
3. Faceted filters support simultaneous filtering by Customer Type, Status, and Subscribed Module, with a one-click `Clear all filters` action when zero rows match.
4. Authorized Platform Super Admins can export the currently filtered tenant dataset to CSV; export generates an audit event.
5. Empty state (no tenants yet) displays guidance and a direct `+ Register Tenant` CTA.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Tenants Directory Search and Filtering

  Scenario: BDD-02.1.1 Platform Admin filters CA Firms subscribed to Payroll
    Given 148 provisioned tenants exist across SMB, Enterprise, and CA Firm archetypes
    When Rajesh filters Customer Type by "CA Firm" and Subscribed Module by "Payroll & HRMS"
    Then only CA Firm tenants with active Payroll subscriptions are displayed
    And the result count updates accurately

  Scenario: BDD-02.1.2 Zero-match filter query shows recoverable empty state
    Given Rajesh searches for "nonexistent-corp-999" in the Tenants Directory
    Then the table displays a zero-match empty state message with a "Reset Filters" action
    When Rajesh activates "Reset Filters"
    Then all active filters clear and the default tenant list reloads
```

---

#### Story `US-02.2`: Multi-Archetype Tenant Onboarding (SMB, Enterprise, CA Firm)
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J2` (Screen 2.2) | **Linked FRs/BRs:** `FR-CORE-012`, `FR-CORE-013`, `BR-001`, `BR-002`, `BR-020`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to onboard a new tenant through a guided multi-step workflow tailored to Individual Business, Enterprise, or CA Firm structures, so that tenant isolation, initial organizations, primary OIDC admin invitation, and commercial entitlements are provisioned atomically without manual database intervention.

**Acceptance Criteria:**
1. Step 1 captures Customer Archetype (`Individual Business`, `Enterprise`, `CA Firm`), Legal Name, globally unique Tenant Slug, Primary Region, Base Currency, and Financial Year cycle, validating slug format and uniqueness (`BR-001`) before advancing.
2. Step 2 adapts organization setup to the chosen archetype: auto-creates one Primary Organization for SMB; allows adding Parent HQ + $N$ Subsidiary Organizations with optional statutory identifiers (GSTIN/CIN) for Enterprise; creates Practice HQ + manual quick-add or CSV bulk import of initial Client Organizations for CA Firms.
3. Step 3 captures the Primary Tenant Administrator (Full Name, Work Email, Phone) and OIDC provisioning mode (`Send Activation Invite` vs. `Pre-link Enterprise SSO Domain`).
4. Step 4 assigns an initial Plan Tier and microservice module entitlements (Tax & Financial Intelligence, Payroll & HRMS, CA Practice & Accounting) with corresponding seat and organization limits, showing a live provisioning summary across all steps.
5. Submitting the wizard executes tenant creation, initial organization creation, entitlement initialization, primary admin invitation dispatch, and `tenant.provisioned` audit emission atomically (rolling back cleanly on failure with actionable error feedback).
6. Duplicate tenant slugs return a `409 Conflict` inline validation error without discarding other entered wizard values.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Multi-Archetype Tenant Onboarding

  Scenario: BDD-02.2.1 Platform Admin onboards a Chartered Accountant Firm with client organizations
    Given Rajesh initiates "Register New Tenant"
    When Rajesh selects archetype "CA Firm" with legal name "Kulkarni, Deshmukh & Associates LLP" and slug "kulkarni-associates"
    And uploads a valid CSV of 10 initial client organizations under Practice HQ
    And specifies primary admin "rohan.kulkarni@kda-llp.in" with OIDC Activation Invite
    And selects plan "CA Practice Pro" enabling "CA Practice", "Tax & Financial", and "Payroll & HRMS"
    And confirms provisioning
    Then the tenant is created with 11 organizations (1 Practice HQ + 10 Client Orgs)
    And an OIDC activation invite is dispatched to "rohan.kulkarni@kda-llp.in"
    And audit event "tenant.provisioned" is recorded

  Scenario: BDD-02.2.2 Duplicate tenant slug is rejected without losing form progress
    Given a tenant with slug "meridian-infra" already exists
    When Rajesh submits Step 1 with slug "meridian-infra"
    Then the system rejects the slug with an inline 409 conflict error
    And preserves all other form inputs so Rajesh can enter a unique slug
```

---

#### Story `US-02.3`: Organization Hierarchy Management (Subsidiaries & Managed Client Entities)
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J2` (Screen 2.3) | **Linked FRs/BRs:** `FR-CORE-014`, `BR-002`, `BR-003`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **Enterprise Tenant Administrator (`PER-02`)**, I want to browse my tenant's organization tree, add new subsidiary or client organizations within my licensed quota, and inspect each organization's members and enabled modules, so that I can onboard new clients or legal entities cleanly as my business grows.

**Acceptance Criteria:**
1. The Organization Hierarchy displays the tenant root and its child organizations (HQ, Subsidiaries, or Managed Client Orgs) with instant tree search and expand/collapse controls.
2. Selecting an organization displays tabbed views for Overview (entity metadata, status), Scoped Members, Enabled Modules, and Organization Audit History.
3. Authorized admins can create a new Subsidiary or Client Organization provided the tenant's current organization count is strictly less than the licensed organization quota.
4. Attempting to add an organization when the quota is reached (`current_orgs >= licensed_org_cap`) blocks creation with a clear quota message and a link to upgrade the subscription.
5. The primary/root organization (`Primary Org` / `HQ` / `Practice HQ`) cannot be deleted while it is the sole organization in the tenant (`BR-002`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Organization Hierarchy Management

  Scenario: BDD-02.3.1 CA Partner adds a new client organization within quota
    Given "Kulkarni, Deshmukh & Associates LLP" has 48 of 50 licensed organizations
    When Rohan Kulkarni adds client organization "Apex Textiles Ltd." with entity type "Client Organization"
    Then "Apex Textiles Ltd." appears under the Practice tenant tree
    And organization utilization updates to 49 of 50
    And audit event "organization.created" is recorded

  Scenario: BDD-02.3.2 Adding an organization beyond licensed quota is blocked
    Given "Kulkarni, Deshmukh & Associates LLP" has reached 50 of 50 licensed organizations
    When Rohan attempts to add another client organization
    Then the system prevents creation and displays a quota-cap notice with a link to Subscriptions
```

---

#### Story `US-02.4`: Tenant Lifecycle Suspension & Reactivation with Impact Safeguards
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J2` / System Confirmation States | **Linked FRs/BRs:** `FR-CORE-015`, `BR-009`, `BR-020`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to suspend or reactivate a tenant with explicit impact confirmation, so that I can immediately halt access for non-compliance or security incidents without risking accidental customer lockouts.

**Acceptance Criteria:**
1. Initiating tenant suspension displays a destructive confirmation dialog listing exact active user count, organization count, and active modules that will lose access immediately.
2. Suspension cannot be confirmed until the administrator types the required confirmation keyword (e.g., tenant short name/slug) and supplies a mandatory suspension reason.
3. Upon confirmation, tenant status changes to `Suspended`, active sessions for tenant users are invalidated, downstream service authorization checks deny requests for that tenant (`BR-009`), and a high-severity audit event (`tenant.suspended`) is emitted.
4. Reactivating a suspended tenant restores status to `Active`, preserves previous organizations, memberships, and entitlements, and records `tenant.reactivated`.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Tenant Suspension and Reactivation

  Scenario: BDD-02.4.1 Platform Admin suspends a tenant using typed confirmation
    Given tenant "Verma Precision Components" is "Active" with 8 active users across Tax and Payroll
    When Rajesh selects "Suspend Tenant", enters confirmation text "VERMA" and reason "Compliance hold", and confirms
    Then tenant status transitions to "Suspended"
    And all 8 active users are immediately denied portal and downstream API access
    And audit event "tenant.suspended" records the actor and reason

  Scenario: BDD-02.4.2 Suspension confirmation is blocked when typed confirmation does not match
    Given Rajesh opens the Suspend Tenant dialog for "Verma Precision Components"
    When Rajesh enters "WRONG" in the confirmation field
    Then the "Confirm Suspension" action remains disabled
```

---

### Epic `EP-03`: User Lifecycle, OIDC Invitations & Seat Quota Enforcement
> **Epic Narrative:** As a **Tenant Administrator (`PER-02`, `PER-03`, `PER-04`)**, I want to invite team members via OIDC within my licensed seat limits and manage their activation and session lifecycle, so that authorized staff gain timely access while inactive or departing personnel can be revoked immediately.

---

#### Story `US-03.1`: Multi-User OIDC Invitation with Real-Time Seat Quota Validation
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J3` (Screens 3.1, 3.2) | **Linked FRs/BRs:** `FR-CORE-017`, `BR-005`, `BR-006`, `BR-020`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **SMB Business Administrator (`PER-04`)**, I want to invite one or more users to specific organizations with assigned roles while seeing real-time licensed seat availability, so that I can onboard staff accurately without accidentally breaching my subscription quota.

**Acceptance Criteria:**
1. The invite workflow accepts one or multiple valid email addresses (including comma-separated paste), target organization multi-selection, and role selection per organization.
2. Before submission, the system computes and displays real-time seat utilization (`Active + Pending + New Invites vs. Licensed Seat Cap`).
3. If the invitation batch would exceed the licensed seat cap, the system displays a quota-exceeded warning and blocks submission (or links directly to seat pack upgrade), preventing unauthorized over-provisioning (`BR-005`).
4. Duplicate emails within the batch or emails already holding an active/pending membership in the same tenant are flagged inline (`BR-006`).
5. Valid invitations create `Invite Sent` records with signed single-use expiry tokens (default 7 days), dispatch activation emails asynchronously, and record `user.invited` audit events.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Multi-User OIDC Invitation and Seat Quota Guard

  Scenario: BDD-03.1.1 CA Partner invites a new staff member within remaining seat quota
    Given "Kulkarni, Deshmukh & Associates LLP" has 24 of 25 seats used
    When Rohan invites "priya.sharma@kda-llp.in" to "Apex Textiles Ltd." with role "CA Audit Manager"
    Then the seat quota check passes showing "25 of 25 seats used"
    And an OIDC activation invitation is dispatched with status "Invite Sent"
    And audit event "user.invited" is recorded

  Scenario: BDD-03.1.2 Batch invitation exceeding seat quota is blocked with upgrade guidance
    Given "Kulkarni, Deshmukh & Associates LLP" has 24 of 25 seats used
    When Rohan enters two new emails "priya@kda-llp.in, rahul@kda-llp.in"
    Then the system displays a Seat Quota Guard warning indicating the batch exceeds the 25-seat cap by 1
    And disables invitation dispatch until Rohan removes 1 email or upgrades seats
```

---

#### Story `US-03.2`: Invited User OIDC Account Activation & Expired-Token Recovery
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J3` (Screen 3.3) | **Linked FRs/BRs:** `FR-CORE-018`, `BR-004`, `BR-005`
* **User Story:** As an **Invited User (`PER-06`)**, I want to review who invited me and what organization role I have been granted before activating my account via managed OIDC, so that I can start working immediately with confidence—and easily request a new link if my invite expired.

**Acceptance Criteria:**
1. Opening a valid invitation link displays the inviting administrator's name, tenant name, assigned role, and target organization summary without requiring prior login.
2. Selecting activation redirects the user to the managed OIDC provider; upon successful OIDC verification where the verified email matches the invited email, the user transitions from `Invite Sent` to `Active`, the token is invalidated (single-use), and `user.activated` is audited.
3. If the OIDC-verified email does not match the invited email, activation is rejected with a clear mismatch message so access cannot be hijacked by another identity.
4. Opening an expired or revoked invitation link displays an `Invitation Expired` state with a one-click `Request New Invite` action that notifies the tenant administrator.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Invited User OIDC Activation

  Scenario: BDD-03.2.1 Invited user activates account via managed OIDC
    Given a valid invitation token exists for "meera@kda-llp.in" as "Tax Reviewer" on "Apex Textiles Ltd."
    When Meera opens the invitation link and completes OIDC verification as "meera@kda-llp.in"
    Then Meera's status transitions to "Active"
    And the invitation token is marked consumed and cannot be reused
    And Meera lands in the workspace scoped to "Apex Textiles Ltd."

  Scenario: BDD-03.2.2 Expired invitation link offers recovery request
    Given the invitation token for "meera@kda-llp.in" expired 2 days ago
    When Meera opens the invitation link
    Then the system displays an "Invitation Expired" message
    And provides a "Request New Invite" action that notifies the inviting administrator
```

---

#### Story `US-03.3`: User Directory Administration, Invite Resend, Session Revocation & Suspension
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J3` (Screen 3.1) | **Linked FRs/BRs:** `FR-CORE-016`, `FR-CORE-019`, `BR-002`, `BR-009`, `BR-020`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)**, I want to filter users by lifecycle state, resend or cancel pending invites, force-revoke active sessions, and suspend departing staff, so that access remains accurate and compromised or offboarded accounts are terminated immediately.

**Acceptance Criteria:**
1. The Users Directory provides segmented views for `All Users`, `Pending Invitations`, and `Suspended / Deactivated`, with search by name/email and filters by role, organization, and identity provider.
2. For `Invite Sent` or `Invite Expired` rows, admins can resend an invite (generating a fresh TTL token and invalidating the old token) or revoke/cancel the invite (releasing the reserved seat slot).
3. For `Active` users, admins can execute `Revoke Sessions` (terminating active refresh/session tokens via OIDC/session store) or `Suspend User` (requiring confirmation and immediately revoking access while preserving historical audit attribution).
4. The system blocks suspending the last remaining active Tenant Administrator (`BR-002`).
5. All lifecycle actions emit corresponding audit events (`user.invite.resent`, `user.invite.revoked`, `user.sessions.revoked`, `user.suspended`, `user.reactivated`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: User Lifecycle and Session Revocation

  Scenario: BDD-03.3.1 Admin suspends a departing employee and frees seat capacity
    Given "arjun@vermaprecision.in" is an "Active" non-sole admin in "Verma Precision Components"
    When an authorized administrator suspends "arjun@vermaprecision.in" and confirms the dialog
    Then Arjun's status becomes "Suspended" and active sessions are invalidated immediately
    And audit event "user.suspended" is recorded

  Scenario: BDD-03.3.2 System prevents suspending the last active Tenant Admin
    Given Vikram Desai is the only active "Tenant Admin" for "Meridian Infrastructure Group"
    When Vikram attempts to suspend his own account
    Then the system blocks the operation and explains that at least one active Tenant Admin is required
```

---

### Epic `EP-04`: Role-Based Access Control (RBAC) & Cross-Service Permission Management
> **Epic Narrative:** As a **Tenant Administrator (`PER-02`, `PER-03`)** or **Platform Super Administrator (`PER-01`)**, I want to define and maintain granular, service-scoped roles aligned with subscribed module entitlements and enforce them consistently across all services, so that every user operates under least-privilege access.

---

#### Story `US-04.1`: System Default & Custom Role Library Management
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J4` (Screen 4.1) | **Linked FRs/BRs:** `FR-CORE-020`, `BR-007`, `BR-008`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)**, I want to browse system default roles, clone them into custom roles, and manage custom role lifecycles, so that I can tailor role definitions to my firm's review hierarchy without starting from scratch or breaking default templates.

**Acceptance Criteria:**
1. The Roles Library clearly separates `System Default Roles` (marked read-only with a lock indicator) and `Custom Tenant Roles`, displaying Role Name, Scope (`Platform`, `Tenant`, `Organization`), Assigned User Count, and Permission Count.
2. System Default Roles cannot be edited or deleted (`BR-007`), but can be duplicated (`Clone Role`) to pre-populate a new Custom Role.
3. Custom Roles can be created, edited, duplicated, or deleted by authorized admins; role names must be unique within the tenant.
4. Attempting to delete a Custom Role with $\ge 1$ assigned user is blocked with a clear dependency count (`BR-008`).
5. When a tenant has no Custom Roles yet, the Custom Roles tab renders an instructional empty state noting that System Default Roles are active, with a `+ Create Custom Role` CTA.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Role Library Management

  Scenario: BDD-04.1.1 CA Partner clones a system default role into a custom role
    Given "CA Audit Associate" is a read-only System Default Role
    When Rohan Kulkarni selects "Clone Role" and names the copy "CA Audit Manager" with scope "Organization"
    Then a new editable Custom Role "CA Audit Manager" is created with the cloned permission set
    And the original System Default Role remains unchanged

  Scenario: BDD-04.1.2 Deleting a custom role with active assignees is blocked
    Given Custom Role "CA Audit Manager" is currently assigned to 14 users
    When Rohan attempts to delete "CA Audit Manager"
    Then the system blocks deletion and informs Rohan that 14 assigned users must be reassigned first
```

---

#### Story `US-04.2`: Cross-Service Role Permission Matrix & Entitlement-Gated Authorization
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J4` (Screen 4.2) | **Linked FRs/BRs:** `FR-CORE-021`, `FR-CORE-022`, `BR-009`, `BR-010`, `BR-020`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **Enterprise Tenant Administrator (`PER-02`)**, I want to configure granular permissions grouped by METRix microservice domain with clear indicators for unsubscribed modules and privilege escalation risks, so that I grant precise operational capabilities without inadvertently exposing administrative controls.

**Acceptance Criteria:**
1. The Role Editor displays a collapsible Permission Matrix grouped by the four METRix HLD service domains: **Platform Core**, **Tax & Financial Intelligence**, **Payroll & HRMS**, and **CA Practice & Accounting**.
2. Each resource row exposes applicable granular actions (`View`, `Create`, `Edit`, `Delete`, `Approve/Export`) with group-level tri-state (`Checked`, `Unchecked`, `Indeterminate`) selection and permission search/service filter controls.
3. Permissions belonging to a microservice not subscribed in the current context appear visually locked (`Entitlement Gate`) and cannot grant effective runtime access (`BR-009`).
4. Enabling high-risk permissions (such as `roles:write`, `subscriptions:manage`, or `config:security.write`) displays an inline Privilege Escalation Warning banner prior to saving (`BR-010`).
5. Saving role changes persists updated permissions, displays a confirmation toast with a direct link to the audit log, and emits `role.permissions.updated` containing structured before/after diffs (plus `role.privilege.escalated` when sensitive permissions are added).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Cross-Service Role Permission Matrix

  Scenario: BDD-04.2.1 Admin updates permissions across Platform Core and Tax while Payroll is locked
    Given "Meridian Energy LLP" is subscribed to "Tax & Financial" but not "Payroll & HRMS"
    When Vikram edits Custom Role "Energy Tax Reviewer"
    Then the "Payroll & HRMS" permission group is shown as locked due to missing entitlement
    When Vikram grants "tax.scenarios:approve" and "audit.logs:export" and saves the role
    Then the updated permissions are persisted
    And audit event "role.permissions.updated" captures the exact before/after permission diff

  Scenario: BDD-04.2.2 Enabling sensitive administrative permissions triggers privilege escalation warning
    Given Vikram is editing Custom Role "Regional Ops Manager"
    When Vikram toggles "subscriptions:manage" to enabled
    Then a Privilege Escalation Warning banner appears before saving
    And upon saving, a "role.privilege.escalated" security alert and audit event are emitted
```

---

#### Story `US-04.3`: Service-Level RBAC Enforcement & Transparent Access-Denied Handling
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J4` / `403` Access-Denied System State | **Linked FRs/BRs:** `FR-CORE-023`, `BR-003`, `BR-009`, `BR-020`
* **User Story:** As a **Scoped Staff Member (`PER-05`)**, I want unauthorized actions to be consistently blocked at the API layer with clear feedback explaining which permission is missing, so that sensitive tenant operations remain protected and I know exactly what access to request when legitimately needed.

**Acceptance Criteria:**
1. Every Platform Core API endpoint enforces server-side RBAC and tenant/org scope verification regardless of frontend visibility (`BR-003`, `BR-009`).
2. Unauthorized API calls return HTTP `403 Forbidden` with a structured error payload containing the required permission code (e.g., `subscriptions:manage`) and target scope without leaking sensitive internal data.
3. Navigating directly to an unauthorized route renders a clear `403 Access Restricted` state showing the missing permission code, target organization/tenant name, and recovery actions (`Return to Dashboard` / `Request Access` where configured).
4. Every `403` denial generates an immutable audit record with outcome `Denied` containing actor, target resource, and OpenTelemetry Trace ID (`BR-020`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Service-Level RBAC Enforcement and 403 Handling

  Scenario: BDD-04.3.1 Direct API call without required permission is rejected and audited
    Given Ananya Iyer holds role "CA Audit Manager" which lacks "subscriptions:manage"
    When Ananya's client sends a request to modify module entitlements for "Meridian Infrastructure Group"
    Then Platform Core returns HTTP 403 Forbidden identifying missing permission "subscriptions:manage"
    And records an immutable audit event with outcome "Denied"

  Scenario: BDD-04.3.2 Direct browser navigation to restricted route shows recoverable 403 view
    Given Ananya navigates directly to "/subscriptions/change" without "subscriptions:manage"
    Then the application displays the "Access Restricted (403)" view naming the missing permission
    And provides a working "Return to Dashboard" action
```

---

### Epic `EP-05`: Organization Membership & Scoped Multi-Org Access Governance
> **Epic Narrative:** As a **CA Firm Managing Partner (`PER-03`)** or **Enterprise Tenant Administrator (`PER-02`)**, I want to map staff to exact organizations with per-organization roles, optional time-bound expiries, and effective-permission previews, so that practitioners only see their assigned client portfolios and zero cross-client leakage occurs.

---

#### Story `US-05.1`: Dual-Pivot Organization Membership Administration (By User & By Organization)
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J5` (Screen 5.1) | **Linked FRs/BRs:** `FR-CORE-024`, `BR-003`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)**, I want to inspect and manage access memberships pivoted either by a specific Client Organization or by a specific CA Staff Member, so that I can quickly verify either "who has access to Client X" or "which clients Staff Member Y can access."

**Acceptance Criteria:**
1. The Organization Memberships Hub provides a toggle between `View by Organization` (lists all members assigned to a selected org) and `View by User` (lists all organizations assigned to a selected user).
2. In `View by User`, the interface explicitly summarizes unassigned organizations (e.g., *"46 Other Client Organizations — No Access / Isolated"*) to confirm multi-org data isolation visually.
3. Both pivot views display Mapped Org Role, Effective Active Modules on that organization, Access Expiry (`Permanent` or expiry date), and contextual actions (`Edit Role`, `Revoke Membership`).
4. Revoking a user's membership on an organization takes effect immediately on subsequent API requests and emits `membership.revoked`.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Dual-Pivot Organization Membership Administration

  Scenario: BDD-05.1.1 CA Partner audits all client access for a specific associate
    Given Ananya Iyer is assigned to "Apex Textiles Ltd." as "CA Audit Manager" and "Narmada Logistics" as "Full Manager" out of 48 client orgs
    When Rohan Kulkarni opens Memberships Hub in "View by User" mode and selects "Ananya Iyer"
    Then Rohan sees both client org assignments with their distinct roles and effective modules
    And sees explicit confirmation that the remaining 46 client organizations are isolated with "No Access"

  Scenario: BDD-05.1.2 Revoking an org membership immediately enforces isolation
    Given Ananya has active access to "Narmada Logistics Pvt. Ltd."
    When Rohan revokes Ananya's membership on "Narmada Logistics Pvt. Ltd."
    Then Ananya's subsequent API requests scoped to "Narmada Logistics Pvt. Ltd." are denied with HTTP 403
    And audit event "membership.revoked" is recorded
```

---

#### Story `US-05.2`: Scoped Multi-Org Role Assignment, Time-Bound Access & Effective Permissions Inspection
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J5` (Screen 5.2) | **Linked FRs/BRs:** `FR-CORE-025`, `FR-CORE-026`, `BR-009`, `BR-011`, `BR-020`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)**, I want to assign a staff member to multiple client organizations with distinct per-org roles, set an optional audit-window expiry date, and preview their computed effective permissions before saving, so that temporary engagements expire automatically and no unintended module access is granted.

**Acceptance Criteria:**
1. The Assign Membership workflow allows multi-selecting organizations within the tenant, choosing an Organization-scoped role per organization, and optionally configuring an Access Expiry date (must be a future date).
2. Before saving, an Effective Permissions Inspector tab displays the computed intersection of the selected role's permissions and each organization's active module entitlements (`BR-009`), clearly marking role permissions that will remain inactive because the module is disabled on that org.
3. Upon reaching the configured expiry timestamp, the time-bound membership automatically stops granting access (`BR-011`) and records `membership.expired`.
4. Assigning or modifying memberships emits `membership.updated` with before/after role and expiry metadata.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Scoped Multi-Org Assignment and Time-Bound Access

  Scenario: BDD-05.2.1 CA Partner grants time-bound audit access and previews effective permissions
    Given "Narmada Logistics" has "Tax & Financial" enabled and "Payroll & HRMS" disabled
    When Rohan assigns Ananya to "Narmada Logistics" with role "Full Manager" and expiry "2027-03-31"
    And inspects the Effective Permissions tab
    Then Tax permissions appear as "Effective" while Payroll permissions appear as "Inactive (Module Not Enabled on Org)"
    When Rohan saves the assignment
    Then the membership is stored with expiry "2027-03-31" and audited

  Scenario: BDD-05.2.2 Expired time-bound membership automatically denies access
    Given Ananya's membership on "Narmada Logistics" had expiry "2026-11-22"
    When current time passes "2026-11-22" and Ananya requests a resource in "Narmada Logistics"
    Then Platform Core denies access due to expired membership
```

---

### Epic `EP-06`: Product Subscriptions & Organization-Level Module Entitlements
> **Epic Narrative:** As an **Enterprise Tenant Administrator (`PER-02`)** or **CA Firm Managing Partner (`PER-03`)**, I want clear visibility into my active subscription, seat/org utilization, and per-organization module entitlements, so that I can activate subscribed METRix modules only where needed and stay compliant with licensed capacity.

---

#### Story `US-06.1`: Tenant Subscription Overview & Microservice Module Utilization Visibility
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J6` (Screen 6.1) | **Linked FRs/BRs:** `FR-CORE-027`, `BR-012`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)**, I want to inspect my tenant's active plan, exact contract value, renewal date, seat/org quotas, and per-service module subscription cards, so that I understand what my organization pays for and which modules are active or available as add-ons.

**Acceptance Criteria:**
1. The Subscriptions Overview displays Active Plan Tier, Billing Cycle, Renewal Date, Contract Value formatted from backend decimal values (`BR-012`), Seat Utilization (`used / cap`), and Organization Utilization (`used / cap`).
2. Dedicated module cards represent each METRix business service (**Tax & Financial Intelligence**, **Payroll & HRMS**, **CA Practice & Accounting**), showing Status (`Active`, `Trial`, `Not Subscribed`, `Upgrade Pending`), included high-level capabilities, count of enabled organizations, and module seat usage.
3. The layout and data contract support rendering additional future SaaS modules dynamically from the product catalog without hardcoded UI limitations.
4. Active modules expose a `Configure Entitlements` action; unsubscribed modules expose an `Enable Module Add-On` action for authorized billing/tenant admins.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Tenant Subscription and Module Overview

  Scenario: BDD-06.1.1 Enterprise Admin inspects active plan and module cards
    Given "Meridian Infrastructure Group" is on plan "Enterprise Multi-Entity" at INR 240000.00/yr with Tax (6/6 orgs) and Payroll (4/6 orgs) active and CA Practice unsubscribed
    When Vikram opens "Subscriptions"
    Then Vikram sees the exact contract value "2,40,000.00", seat usage "142 / 150", and org usage "6 / 10"
    And sees "Tax & Financial Intelligence" and "Payroll & HRMS" marked "Active"
    And sees "CA Practice & Accounting" marked "Not Subscribed" with an "Enable Module Add-On" CTA
```

---

#### Story `US-06.2`: Granular Per-Organization Module Entitlement & Seat Allocation Management
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J6` (Screen 6.2) | **Linked FRs/BRs:** `FR-CORE-028`, `BR-009`, `BR-014`, `BR-020`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **Enterprise Tenant Administrator (`PER-02`)**, I want to toggle subscribed modules on or off per organization and allocate per-organization seat limits, so that I can enable Payroll only for specific client organizations or subsidiaries while keeping Tax enabled everywhere.

**Acceptance Criteria:**
1. The Per-Org Entitlement Matrix maps all organizations in the tenant (rows) against all tenant-subscribed modules (columns), allowing authorized admins to toggle module access per organization and adjust per-org seat allocations.
2. Modules not subscribed at the tenant level appear locked across all organizations and cannot be toggled on until added to the subscription.
3. Sum of allocated seats across organizations cannot exceed the tenant's licensed module seat cap.
4. Enabling a module for an organization immediately updates entitlement claims consumed by downstream services and emits `entitlement.org.updated`.
5. Disabling a module for an organization with active users displays a soft confirmation warning identifying affected users before committing (`BR-014`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Granular Organization-Level Module Entitlements

  Scenario: BDD-06.2.1 Enterprise Admin enables Payroll for an additional subsidiary
    Given "Meridian Infrastructure Group" has "Payroll & HRMS" subscribed with 88 of 100 seats allocated
    And "Payroll & HRMS" is currently "Off" for "Meridian Energy LLP"
    When Vikram enables "Payroll & HRMS" for "Meridian Energy LLP" and allocates 10 seats
    Then the total allocated Payroll seats updates to 98 of 100
    And "Meridian Energy LLP" users with Payroll roles gain immediate access to Payroll & HRMS
    And audit event "entitlement.org.updated" is recorded

  Scenario: BDD-06.2.2 Over-allocating module seats across organizations is rejected
    Given "Payroll & HRMS" has 98 of 100 seats allocated
    When Vikram attempts to allocate 15 seats to another subsidiary
    Then the system rejects the save with a validation error indicating only 2 module seats remain
```

---

### Epic `EP-07`: Subscription Changes, Upgrades, Downgrades & Proration Safeguards
> **Epic Narrative:** As an **Enterprise Tenant Administrator (`PER-02`)** or **Platform Super Administrator (`PER-01`)**, I want to upgrade plans, add modules, or safely downgrade subscriptions with precision-safe proration previews and usage-conflict blockers, so that commercial changes are transparent and never cause accidental data loss or broken workspaces.

---

#### Story `US-07.1`: Plan Upgrade, Module Add-On & Precision-Safe Proration Preview
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J7` (Screen 7.1) | **Linked FRs/BRs:** `FR-CORE-029`, `BR-012`, `BR-020`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)**, I want to compare plan tiers, add a new module or seat pack, and review an exact prorated charge preview before confirming, so that I can budget accurately and unlock new capabilities immediately.

**Acceptance Criteria:**
1. The Plan & Module Configurator displays available plan tiers (`Starter`, `Growth`, `Enterprise`, `CA Practice Pro`), module add-on toggles, seat/organization pack steppers, and an effective-timing selector (`Immediate` vs. `End of Current Billing Cycle`).
2. Any configuration change calls the backend pricing/proration endpoint (using `Decimal.js` / PostgreSQL `NUMERIC`, `BR-012`) to return Current Total, New Total, and Exact Prorated Charge/Credit for remaining billing days.
3. Confirming an `Immediate` upgrade updates tenant plan tier, quotas, and module entitlements atomically, emits `subscription.upgraded`, and publishes entitlement-update events to downstream services.
4. Confirming an `End of Current Billing Cycle` change schedules the pending change visibly on the Subscriptions Overview without disrupting current entitlements prematurely.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Subscription Upgrade and Proration Preview

  Scenario: BDD-07.1.1 Enterprise Admin adds 25 seats and previews exact decimal proration
    Given "Meridian Infrastructure Group" is mid-cycle on an Annual plan with 150 seats
    When Vikram increases the seat pack by 25 seats with effective timing "Immediate"
    Then the summary displays backend-calculated prorated charges exact to 2 decimal places
    When Vikram confirms the upgrade
    Then the tenant's licensed seat cap immediately increases to 175
    And audit event "subscription.upgraded" records the previous and new plan terms
```

---

#### Story `US-07.2`: Subscription Downgrade & Module Removal Safeguards
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J7` (Screen 7.2) | **Linked FRs/BRs:** `FR-CORE-030`, `BR-012`, `BR-013`, `BR-014`, `BR-020`
* **User Story:** As an **Enterprise Tenant Administrator (`PER-02`)**, I want clear hard blockers and soft impact warnings before removing a module or lowering seat/org limits, so that I resolve active usage conflicts cleanly and acknowledge user access impacts before committing an irreversible downgrade.

**Acceptance Criteria:**
1. Selecting a lower seat cap or organization cap triggers a backend usage validation check; if `active_users > new_seat_cap` or `active_orgs > new_org_cap`, the Downgrade Safeguard Dialog displays a **Hard Blocker** detailing the exact count to deactivate/archive first and disables confirmation (`BR-013`).
2. Removing an active module (or downgrading when hard blockers are clear) displays a **Soft Impact Warning** specifying exact affected user and organization counts, stating that historical domain data remains archived per retention policy, and showing exact decimal proration credit (`BR-014`).
3. Confirming a destructive downgrade/module removal requires both explicit acknowledgement checkbox selection and typed tenant confirmation text.
4. Upon confirmation, affected module entitlements are revoked per selected effective timing, downstream services enforce revocation, and `subscription.downgraded` is recorded in the audit log.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Subscription Downgrade and Module Removal Safeguards

  Scenario: BDD-07.2.1 Reducing seat limit below active users is blocked by Hard Blocker
    Given tenant "Kulkarni, Deshmukh & Associates LLP" has 24 active users
    When Rohan attempts to downgrade to a plan with a 20-seat cap
    Then the Downgrade Safeguard Dialog displays a Hard Blocker stating 4 users must be deactivated first
    And the "Confirm Downgrade" button remains disabled

  Scenario: BDD-07.2.2 Removing Payroll module displays Soft Impact Warning and proration credit
    Given "Meridian Infrastructure Group" has 18 active users across 4 orgs using "Payroll & HRMS"
    When Vikram unchecks "Payroll & HRMS" and proceeds to review
    Then the dialog lists the 18 affected users across 4 organizations and displays exact proration credit "INR 42,684.93"
    When Vikram acknowledges access revocation, types "MERIDIAN", and confirms
    Then "Payroll & HRMS" entitlements are disabled across all 4 organizations
    And audit event "subscription.downgraded" is recorded
```

---

### Epic `EP-08`: Platform Configuration, Identity Policies, I18N & Service Registry
> **Epic Narrative:** As a **Platform Super Administrator (`PER-01`)** or **Tenant Administrator (`PER-02`, `PER-03`, `PER-04`)**, I want to govern global localization (including future multi-language options), managed OIDC/SSO security policies, quota defaults, microservice registry health, and integration credentials from one configuration workspace, so that the platform remains secure, compliant, accessible to regional teams, and observable as services scale.

---

#### Story `US-08.1`: Platform Localization, Tenant Quotas & Managed OIDC/SSO Policy Administration
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J8` (Screen 8.1) | **Linked FRs/BRs:** `FR-CORE-031`, `BR-004`, `BR-018`, `BR-020`, `BR-023`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to administer global localization defaults, tenant trial/retention quotas, and managed OIDC/MFA session policies with unsaved-change protection and security confirmations, so that platform-wide identity and compliance standards are enforced without accidental misconfiguration.

**Acceptance Criteria:**
1. Configuration is organized into clear domains: `General & Localization` (platform display name, default `BCP-47` locale defaulting to `en-IN`, timezone, date/number formats, default FY cycle), `Authentication & OIDC/SSO` (issuer URL, masked client ID, redirect URIs, MFA enforcement toggle, idle timeout, concurrent session policy), and `Tenant Isolation & Quotas` (default trial duration, hard/soft quota mode, statutory audit retention period).
2. Modifying any field activates a dirty-form unsaved changes bar (`Discard` / `Save Changes`) and warns before navigating away with unsaved edits (`BR-018`).
3. Validations reject malformed URLs, non-HTTPS OIDC issuers (outside local dev), invalid `BCP-47` locale tags, invalid session timeouts, or retention periods below statutory minimum.
4. Saving changes in `Authentication & OIDC/SSO` requires a high-impact confirmation dialog explaining active-session effects before committing.
5. Saved configuration edits emit `config.updated` audit events capturing masked before/after diffs (never logging secrets in plaintext).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Platform Security and Quota Configuration

  Scenario: BDD-08.1.1 Platform Admin updates OIDC idle timeout with confirmation guard
    Given Rajesh Kapoor opens "Platform Configuration -> Authentication & OIDC/SSO"
    When Rajesh changes Session Idle Timeout from "60 minutes" to "30 minutes"
    Then the unsaved changes bar appears with "Discard" and "Save Changes"
    When Rajesh selects "Save Changes" and confirms the Security Impact Dialog
    Then the updated timeout policy is persisted
    And audit event "config.updated" records the change from "60m" to "30m"

  Scenario: BDD-08.1.2 Non-HTTPS OIDC Issuer URL fails validation
    Given Rajesh edits the OIDC Issuer Discovery URL to "http://insecure.example.com"
    When Rajesh attempts to save
    Then the system rejects the change with an inline HTTPS validation error
```

---

#### Story `US-08.2`: Microservice Registry Visibility, API Keys & Outbound Webhook Administration
* **Priority:** P2 (Slice 3) | **Figma Reference:** `J8` (Screen 8.1) | **Linked FRs/BRs:** `FR-CORE-032`, `FR-CORE-033`, `BR-020`, `BR-022`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to inspect operational health and API contract versions of all registered METRix microservices and manage scoped integration API keys and outbound webhooks, so that cross-service integrations remain reliable and credentials follow least-privilege rotation practices.

**Acceptance Criteria:**
1. The Service Registry tab displays read-only health status, OpenAPI contract version, and last heartbeat for each registered microservice (Platform Core, Tax & Financial Intelligence, Payroll & HRMS, CA Practice & Accounting).
2. Administrators can create a scoped API key with an explicit name, permission scope, and optional expiration; the raw secret is shown exactly once upon creation and masked thereafter (`BR-022`).
3. Existing API keys support zero-downtime rotation (or immediate revocation with confirmation), emitting `apikey.created`, `apikey.rotated`, or `apikey.revoked`.
4. Administrators can register, enable/disable, and delete outbound webhook endpoints subscribed to selected Platform Core event types, validating HTTPS endpoint URLs and providing a signing secret (masked after creation).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Service Registry, API Keys and Webhooks

  Scenario: BDD-08.2.1 Platform Admin creates a scoped API key and sees secret once
    Given Rajesh opens "Platform Configuration -> API Keys & Webhooks"
    When Rajesh creates an API key named "SIEM Audit Collector" with scope "audit.logs:read"
    Then the full API key secret is displayed once in a copy dialog
    And after dismissing the dialog, the directory shows only a masked prefix and suffix
    And audit event "apikey.created" is recorded without storing the raw secret

  Scenario: BDD-08.2.2 Service Registry reflects degraded downstream service health
    Given "Payroll & HRMS Service" fails its readiness health probe
    When Rajesh views the "Service Registry" tab
    Then "Payroll & HRMS Service" displays status "Degraded" alongside its API contract version "v1.1"
    And the other 3 microservices continue displaying "Operational"
```

---

#### Story `US-08.3`: Multi-Language Selection & Locale Extensibility (Future I18N Option)
* **Priority:** P3 (Future Slice — Post-MVP) | **Figma Reference:** `J8` (Screen 8.1 General & Localization) & Unified Shell Profile Menu | **Linked FRs/BRs:** `FR-CORE-040`, `BR-017`, `BR-020`, `BR-023`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)** or **SMB Business Administrator (`PER-04`)**, I want to configure a default display language for my tenant and allow individual users to select their preferred language once additional languages are enabled on METRix, so that regional teams can administer Platform Core comfortably in their preferred language while preserving standardized audit and statutory records.

**Acceptance Criteria:**
1. Platform Core exposes a configurable catalog of enabled `BCP-47` languages (initial baseline: `en-IN`); when only one language is enabled, the user-facing language selector remains hidden/feature-flagged to avoid unnecessary UI clutter.
2. When two or more languages are enabled at the platform level, Tenant Administrators can configure a Tenant Default Language in localization settings, and individual users can override their personal display language from the Profile/Preferences menu.
3. Active display language resolves deterministically via `User Profile Locale -> Tenant Default Locale -> Platform Default (en-IN)`, persists across sessions, and propagates across Platform Core and downstream METRix modules through the Unified App Shell (`BR-017`, `BR-023`).
4. Any UI label, validation error, or notification template key missing from a non-default language bundle automatically falls back to `en-IN` without displaying raw translation keys (`BR-023`).
5. Canonical system identifiers—including RBAC permission codes (e.g., `subscriptions:manage`), API enum values, and immutable audit event action codes (e.g., `role.permissions.updated`)—remain language-neutral (English) regardless of the user's selected display language (`BR-023`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Future Multi-Language Selection and Locale Resolution

  Scenario: BDD-08.3.1 User overrides tenant default language and retains preference across modules
    Given the platform has enabled languages "en-IN" and "hi-IN"
    And tenant "Verma Precision Components" has Tenant Default Locale "en-IN"
    When Arjun Verma selects "hi-IN" in his user profile language preferences
    Then Platform Core renders localized UI copy in "hi-IN" and persists "hi-IN" to Arjun's profile
    And when Arjun switches to "Tax & Financial Intelligence" via the Unified Module Switcher
    Then the resolved locale "hi-IN" is preserved across the shell

  Scenario: BDD-08.3.2 Missing translation key falls back cleanly to default English (en-IN)
    Given Arjun's active display locale is "hi-IN"
    And a newly introduced notification label is not yet translated in the "hi-IN" resource bundle
    When Arjun opens the Notifications page
    Then the system renders the "en-IN" fallback text rather than an empty string or raw message key

  Scenario: BDD-08.3.3 Audit event action codes remain canonical English regardless of actor locale
    Given Arjun updates a custom role while using display locale "hi-IN"
    When an Auditor inspects the resulting audit event
    Then the event action is stored canonically as "role.permissions.updated" with outcome "Success"
```

---

### Epic `EP-09`: Centralized Audit Log Orchestration, Search & State-Diff Inspection
> **Epic Narrative:** As a **Security & Compliance Auditor (`PER-07`)** or **Platform/Tenant Administrator (`PER-01`, `PER-02`, `PER-03`)**, I want to search, filter, inspect exact before/after diffs, and export immutable audit trails across Platform Core and downstream business services, so that I can verify regulatory compliance and investigate security incidents conclusively.

---

#### Story `US-09.1`: Cross-Service Audit Log Search, Faceted Filtering & Controlled Export
* **Priority:** P0 (Slice 1) | **Figma Reference:** `J9` (Screen 9.1) | **Linked FRs/BRs:** `FR-CORE-034`, `FR-CORE-036`, `BR-003`, `BR-019`, `BR-020`
* **User Story:** As a **Security & Compliance Auditor (`PER-07`)**, I want to search and filter immutable audit logs across services by date range, tenant, service source, action category, actor, and outcome—and export filtered results—so that I can produce auditable compliance evidence quickly without database access.

**Acceptance Criteria:**
1. The Audit Log Explorer displays Timestamp (with explicit timezone indicator), Actor, Tenant/Org, Service Source (`Platform Core`, `Tax & Financial`, `Payroll & HRMS`, `CA Practice`), Event Action, Target Resource, Source IP, and Outcome (`Success`, `Denied`, `Failed`).
2. Full-text search matches Actor Name/Email, Event ID, Target Resource ID, and OpenTelemetry Trace ID.
3. Faceted filters support Date Range (`Last 24h`, `7d`, `30d`, Custom), Tenant (Platform Super Admin only; locked to current tenant/org for Tenant/Org Auditors per `BR-003`), Service Source, Action Category (`Auth`, `RBAC`, `Subscription`, `Config`, `Tenancy`), and Outcome.
4. Users holding `audit.logs:export` can export the active filtered dataset as CSV or JSON; users without export permission do not see or cannot invoke the export endpoint (`403`). Every export emits an `audit.logs.exported` event.
5. No UI action or API endpoint exists to modify or delete audit log entries (`BR-019`).

**Illustrative BDD Scenarios:**
```gherkin
Feature: Centralized Audit Log Search and Export

  Scenario: BDD-09.1.1 Auditor filters denied cross-service events and exports CSV
    Given an Auditor is authorized with "audit.logs:read" and "audit.logs:export" on "Kulkarni, Deshmukh & Associates LLP"
    When the Auditor filters Service Source by "Payroll & HRMS" and Outcome by "Denied" over the last 7 days
    Then only denied Payroll audit events belonging to "Kulkarni, Deshmukh & Associates LLP" appear
    When the Auditor selects "Export CSV"
    Then a CSV file matching the exact filtered rows is generated
    And audit event "audit.logs.exported" is recorded

  Scenario: BDD-09.1.2 Tenant-scoped auditor cannot query another tenant's audit logs
    Given an Auditor is scoped solely to "Meridian Infrastructure Group"
    When the Auditor queries the audit API specifying tenant "TNT-0319" (Kulkarni LLP)
    Then Platform Core rejects the request with HTTP 403 Forbidden
```

---

#### Story `US-09.2`: Immutable Audit Event Inspection & Structured Before/After State Diff
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J9` (Screen 9.2) | **Linked FRs/BRs:** `FR-CORE-035`, `BR-019`, `BR-022`
* **User Story:** As a **Security & Compliance Auditor (`PER-07`)**, I want to inspect any audit event in detail—including Actor OIDC Subject ID, OpenTelemetry Trace ID, and a structured before/after state diff—so that I can prove exactly what changed and correlate it with distributed system traces.

**Acceptance Criteria:**
1. Selecting any audit log row opens an inspection panel displaying Event ID, copyable OpenTelemetry Trace ID, Outcome, exact UTC/local Timestamp, Actor OIDC Subject ID, Tenant ID, Organization ID, Source IP, and User Agent.
2. For state-mutation events (e.g., `role.permissions.updated`, `entitlement.org.updated`, `config.updated`), a structured diff view clearly distinguishes removed/previous values from added/new values.
3. Sensitive fields (API keys, OIDC client secrets, authorization tokens) are redacted/masked in both the diff viewer and the `Copy Raw JSON` payload (`BR-022`).
4. For read-only or denial events without state mutation, the diff panel displays an informative "No state mutation (Read/Denied event)" summary alongside request metadata.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Audit Event Detail and State Diff Inspection

  Scenario: BDD-09.2.1 Auditor inspects before/after permission diff on a role update
    Given audit event "EVT-98412" recorded "role.permissions.updated" by Rohan Kulkarni
    When the Auditor selects row "EVT-98412"
    Then the inspector displays Trace ID "4bf92f3577b34da6", Actor OIDC Subject "usr_kda_01", and Tenant "TNT-0319"
    And highlights "tax.scenarios:approve" changed from false to true and "audit.logs:export" changed from false to true

  Scenario: BDD-09.2.2 Sensitive secrets remain redacted in audit diff and raw JSON copy
    Given audit event "EVT-98500" recorded "config.updated" for OIDC client credentials
    When the Auditor opens "EVT-98500" and copies the raw JSON payload
    Then the OIDC client secret value appears as "[REDACTED]"
```

---

### Epic `EP-10`: Notification Orchestration, Routing Rules & User Preferences
> **Epic Narrative:** As a **Platform Super Administrator (`PER-01`)** or **Tenant Administrator (`PER-02`, `PER-03`)**, I want to orchestrate event-to-channel notification routing, diagnose asynchronous delivery failures, and customize my own alert cadence, so that critical governance events reach the right stakeholders reliably without causing alert fatigue.

---

#### Story `US-10.1`: Platform Notification Channel & Event Routing Rule Administration
* **Priority:** P1 (Slice 2) | **Figma Reference:** `J10` (Screen 10.1) | **Linked FRs/BRs:** `FR-CORE-037`, `BR-020`, `BR-021`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to configure which Platform Core events dispatch to In-App, Email, and Webhook channels for each recipient role and send test dispatches, so that operational and security alerts reliably reach responsible teams.

**Acceptance Criteria:**
1. The Notification Administration view displays operational status for each configured delivery channel (`In-App Feed`, `Transactional Email`, `Webhook Dispatch`).
2. An Event Routing Matrix maps Platform Core events (`Tenant Provisioned`, `User Invited`, `Role Privilege Escalated`, `Seat Quota >= 90%`, `Subscription Changed`, `OIDC Auth Anomaly`) to per-channel toggles and target recipient roles.
3. Critical security events cannot have all delivery channels disabled simultaneously (`BR-021`).
4. Administrators can trigger a `Send Test Dispatch` for a selected event/channel to verify delivery end-to-end without affecting production tenant users.
5. Routing rule changes emit `notifications.rules.updated` audit events.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Notification Event Routing Administration

  Scenario: BDD-10.1.1 Platform Admin enables Webhook routing for Tenant Provisioned events
    Given Rajesh opens "Notifications -> Administration"
    When Rajesh enables the "Webhook" channel for "Tenant Provisioned" targeting "Platform Super Admin" and saves
    Then subsequent "tenant.provisioned" events enqueue asynchronous webhook deliveries
    And audit event "notifications.rules.updated" is recorded

  Scenario: BDD-10.1.2 Disabling all channels on a critical security event is blocked
    Given "OIDC Auth Anomaly Detected" is marked as a mandatory security event
    When Rajesh attempts to disable In-App, Email, and Webhook simultaneously for that event
    Then the system prevents saving and states that at least one active channel is required for critical security events
```

---

#### Story `US-10.2`: Notification Delivery Diagnostics & Asynchronous Retry Management
* **Priority:** P2 (Slice 3) | **Figma Reference:** `J10` (Screen 10.1 — Delivery Logs Sub-Tab) | **Linked FRs/BRs:** `FR-CORE-038`, `BR-020`
* **User Story:** As a **Platform Super Administrator (`PER-01`)**, I want to inspect notification delivery logs and manually retry failed or bounced asynchronous dispatches, so that transient email or webhook outages do not result in silently missed customer invitations or quota alerts.

**Acceptance Criteria:**
1. The Delivery Logs view lists recent notification jobs processed asynchronously (e.g., via Redis/BullMQ), showing Job ID, Event Type, Channel, Recipient/Endpoint, Attempt Count, Timestamp, and Status (`Delivered`, `Bounced`, `Retrying`, `Failed`) with failure reason metadata.
2. Logs can be filtered by Status, Channel, Event Type, and Date Range.
3. Authorized admins can trigger a one-click `Retry Delivery` action on `Failed` or `Bounced` jobs, enqueueing a new idempotent delivery attempt and recording `notification.delivery.retried`.
4. Already `Delivered` jobs do not expose a retry action to prevent duplicate notifications.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Notification Delivery Diagnostics and Retry

  Scenario: BDD-10.2.1 Platform Admin retries a failed webhook delivery job
    Given notification job "JOB-4402" for "tenant.provisioned" has status "Failed" due to "HTTP 503 Upstream Timeout"
    When Rajesh activates "Retry Delivery" on "JOB-4402"
    Then a new idempotent delivery attempt is queued with status "Retrying"
    And audit event "notification.delivery.retried" is recorded
```

---

#### Story `US-10.3`: Administrator Personal Notification Preferences & Digest Cadence
* **Priority:** P2 (Slice 3) | **Figma Reference:** `J10` (Screen 10.2) | **Linked FRs/BRs:** `FR-CORE-039`, `BR-021`
* **User Story:** As a **CA Firm Managing Partner (`PER-03`)**, I want to choose which non-critical alert categories arrive in real time versus a daily digest and set quiet hours, so that I stay informed about client onboarding and quotas without being interrupted constantly during client meetings.

**Acceptance Criteria:**
1. Under `My Preferences`, any authenticated administrator can toggle In-App and Email preferences across categories (`Security & Access`, `Tenancy & Onboarding`, `Billing & Quotas`, `System Alerts`).
2. Users can select Delivery Cadence (`Real-time` vs. `Daily Digest` with configurable local time such as `09:00 IST`) and configure an optional `Mute non-critical alerts` quiet window.
3. Critical security notifications (`Security & Access` high-severity alerts) remain visibly locked to real-time delivery and cannot be muted (`BR-021`).
4. Saved preferences persist to the user's profile and apply immediately to subsequent notification evaluations.

**Illustrative BDD Scenarios:**
```gherkin
Feature: Personal Notification Preferences

  Scenario: BDD-10.3.1 CA Partner configures Daily Digest for Tenancy alerts while Security remains Real-time
    Given Rohan Kulkarni opens "Notifications -> My Preferences"
    When Rohan sets "Tenancy & Onboarding" Email delivery to "Daily Digest at 09:00 IST" and saves
    Then non-critical onboarding emails are batched for 09:00 IST delivery
    And critical "Security & Access" alerts remain locked to "Real-time" delivery
```

---

## 7. Non-Functional Requirements

| NFR ID | Quality Attribute | Verifiable Requirement & Target Standard |
| :--- | :--- | :--- |
| **NFR-SEC-01** | Authentication Security | All sessions shall rely on Managed OIDC / OAuth 2.0 with PKCE, short-lived JWT access tokens, secure `HttpOnly`/`SameSite` cookies (or BFF token handling), and TLS 1.3 in transit; zero end-user passwords stored in Platform DB. |
| **NFR-SEC-02** | Authorization Integrity | 100% of Platform Core REST endpoints and downstream service contracts shall enforce server-side RBAC and entitlement verification; client-side hiding is purely ergonomic and never treated as a security boundary. |
| **NFR-SEC-03** | Secret Protection | API keys, webhook signing secrets, and OIDC client secrets shall be encrypted at rest (or cryptographically hashed for API keys), masked in all read APIs, and redacted from application logs and audit JSON diffs. |
| **NFR-ISO-01** | Multi-Tenant Data Isolation | Every tenant-owned database record and API query shall enforce mandatory `tenant_id` (and `organization_id` where org-scoped) isolation, validated by automated cross-tenant negative E2E and integration tests (`Testcontainers` + `Playwright`). |
| **NFR-ISO-02** | CA Firm Client Isolation | A CA staff member assigned to Organization A within a CA Practice tenant shall have zero read, search, or enumeration access to Organization B within the same practice tenant. |
| **NFR-AUD-01** | Audit Immutability & Completeness | 100% of state-changing Platform Core operations and `403` denials shall write append-only audit records atomically (using local transactions and transactional outbox for cross-service reliability) correlated with OpenTelemetry `trace_id`. |
| **NFR-AUD-02** | Audit Retention | Audit records shall support configurable retention up to statutory minimums (default 7 years via PostgreSQL + immutable S3 archive) without degrading active search performance. |
| **NFR-PERF-01** | Interactive API Latency | Standard read/list APIs (Tenants, Users, Roles, Entitlements) shall respond at $p95 \le 300\text{ ms}$ under nominal multi-tenant load; RBAC/entitlement authorization checks (Redis-cached with event-driven invalidation) shall evaluate at $p95 \le 50\text{ ms}$. |
| **NFR-PERF-02** | Audit Search & Export | Filtered audit queries over a 30-day window shall return first page ($50$ rows) at $p95 \le 1.5\text{ s}$; large exports exceeding synchronous threshold shall execute asynchronously with download notification. |
| **NFR-REL-01** | Availability & Resilience | Platform Core Service shall target $\ge 99.9\%$ monthly availability; asynchronous notification and webhook dispatch shall use durable queues (Redis/BullMQ) with exponential backoff and dead-letter visibility. |
| **NFR-REL-02** | Financial Precision | All subscription contract amounts and proration previews shall use exact decimal arithmetic (`Decimal.js` + PostgreSQL `NUMERIC`) with zero floating-point rounding drift across repeated calculations. |
| **NFR-A11Y-01** | WCAG 2.1 AA Compliance | All Light and Dark theme tokens shall meet $\ge 4.5:1$ contrast for body text/badges and $\ge 3:1$ for UI controls/focus indicators; all interactive overlays (floating nav, drawers, modals, popovers) shall support full keyboard navigation (`Tab`, `Esc`, `Cmd/Ctrl+B`, `Cmd/Ctrl+Shift+P`, `Cmd/Ctrl+K`), focus trapping, and ARIA landmarks. |
| **NFR-I18N-01** | Localization & Regional Formats | Platform Core shall support tenant-configurable timezones (default `Asia/Kolkata` / IST), ISO currency formatting (default `INR` with Indian/international grouping options), locale-aware date/number formatting (`Intl`), and configurable Financial Year cycles (default `Apr-Mar`), storing all backend timestamps in UTC. |
| **NFR-I18N-02** | Multi-Language Readiness & Extensibility | To enable multiple languages cleanly in future without architectural rework: (a) all UI copy, form labels, validation errors, and notification templates shall be externalized into structured locale resource bundles (e.g., ICU MessageFormat / JSON namespaces) using `BCP-47` locale keys (`en-IN` baseline) with zero hardcoded UI strings; (b) PostgreSQL persistence shall use UTF-8 encoding and store nullable/defaulted `locale` columns on platform/tenant configuration and user UI preferences (`ui_locale`); (c) layouts shall accommodate $\ge 30\%$ string expansion and support logical directional properties (e.g., Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`) for future script/RTL compatibility; and (d) canonical permission codes, API enums, and audit event actions shall remain locale-independent. |
| **NFR-SCAL-01** | Multi-Product Extensibility | Product catalog, RBAC permission registries, entitlement matrices, and the Unified Module Switcher shall be data-driven so onboarding a 5th+ future METRix SaaS module requires configuration/registration rather than hardcoding Platform Core UI or schema migrations. |
| **NFR-SCAL-02** | Enterprise & CA Scale | Platform Core shall support at least $10{,}000$ tenants, CA Practice tenants managing $\ge 500$ Client Organizations each, and $\ge 100{,}000$ users without UI degradation (via server-side pagination, virtualized/searchable trees, and indexed queries). |

---

## 8. Traceability Matrix

Maps every Figma Journey & Screen directly to Functional Requirements, Business Rules, Epics, Child User Stories, Acceptance Criteria, and Illustrative BDD Scenarios.

| Figma Journey / Screen | Functional Requirements | Business Rules | Epic | Child User Story | Acceptance Criteria | Illustrative BDD Scenarios |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **J1 / 1.1** OIDC Sign-In & Workspace Picker | `FR-CORE-001`, `FR-CORE-002` | `BR-003`, `BR-004` | `EP-01` | `US-01.1` | `US-01.1` AC 1–6 | `BDD-01.1.1` – `BDD-01.1.3` |
| **J1 / 1.2** Platform Admin Dashboard | `FR-CORE-003` | `BR-003` | `EP-01` | `US-01.2` | `US-01.2` AC 1–5 | `BDD-01.2.1` – `BDD-01.2.2` |
| **J1 / Shell** Hidden/Overlay/Pinned Nav, Pin Up/Down, Light/Dark/System | `FR-CORE-004`, `FR-CORE-005`, `FR-CORE-006`, `FR-CORE-007` | `BR-017` | `EP-01` | `US-01.3` | `US-01.3` AC 1–6 | `BDD-01.3.1` – `BDD-01.3.3` |
| **J11 / 5.1, 5.2** Unified Module Switcher & Tax Target Shell | `FR-CORE-008`, `FR-CORE-009` | `BR-009`, `BR-015`, `BR-017` | `EP-01` | `US-01.4` | `US-01.4` AC 1–5 | `BDD-01.4.1` – `BDD-01.4.3` |
| **J11 / 5.3** Org-Disabled Graceful Fallback Banner | `FR-CORE-010` | `BR-003`, `BR-016` | `EP-01` | `US-01.5` | `US-01.5` AC 1–5 | `BDD-01.5.1` – `BDD-01.5.2` |
| **J2 / 2.1** Tenants Directory | `FR-CORE-011` | `BR-003` | `EP-02` | `US-02.1` | `US-02.1` AC 1–5 | `BDD-02.1.1` – `BDD-02.1.2` |
| **J2 / 2.2** 4-Step Tenant Onboarding Wizard | `FR-CORE-012`, `FR-CORE-013` | `BR-001`, `BR-002`, `BR-020` | `EP-02` | `US-02.2` | `US-02.2` AC 1–6 | `BDD-02.2.1` – `BDD-02.2.2` |
| **J2 / 2.3** Organization Hierarchy Tree | `FR-CORE-014` | `BR-002`, `BR-003` | `EP-02` | `US-02.3` | `US-02.3` AC 1–5 | `BDD-02.3.1` – `BDD-02.3.2` |
| **J2 / Edge** Tenant Suspension & Reactivation | `FR-CORE-015` | `BR-009`, `BR-020` | `EP-02` | `US-02.4` | `US-02.4` AC 1–4 | `BDD-02.4.1` – `BDD-02.4.2` |
| **J3 / 3.1, 3.2** Invite Users Drawer & Seat Quota Guard | `FR-CORE-017` | `BR-005`, `BR-006`, `BR-020` | `EP-03` | `US-03.1` | `US-03.1` AC 1–5 | `BDD-03.1.1` – `BDD-03.1.2` |
| **J3 / 3.3** Invited User OIDC Activation | `FR-CORE-018` | `BR-004`, `BR-005` | `EP-03` | `US-03.2` | `US-03.2` AC 1–4 | `BDD-03.2.1` – `BDD-03.2.2` |
| **J3 / 3.1** Users Directory Lifecycle & Session Revoke | `FR-CORE-016`, `FR-CORE-019` | `BR-002`, `BR-009`, `BR-020` | `EP-03` | `US-03.3` | `US-03.3` AC 1–5 | `BDD-03.3.1` – `BDD-03.3.2` |
| **J4 / 4.1** Roles Library (System vs. Custom) | `FR-CORE-020` | `BR-007`, `BR-008` | `EP-04` | `US-04.1` | `US-04.1` AC 1–5 | `BDD-04.1.1` – `BDD-04.1.2` |
| **J4 / 4.2** 4-Service Permission Matrix | `FR-CORE-021`, `FR-CORE-022` | `BR-009`, `BR-010`, `BR-020` | `EP-04` | `US-04.2` | `US-04.2` AC 1–5 | `BDD-04.2.1` – `BDD-04.2.2` |
| **J4 / Edge** 403 Access-Denied State & API Guard | `FR-CORE-023` | `BR-003`, `BR-009`, `BR-020` | `EP-04` | `US-04.3` | `US-04.3` AC 1–4 | `BDD-04.3.1` – `BDD-04.3.2` |
| **J5 / 5.1** Org Memberships Dual-Pivot Hub | `FR-CORE-024` | `BR-003` | `EP-05` | `US-05.1` | `US-05.1` AC 1–4 | `BDD-05.1.1` – `BDD-05.1.2` |
| **J5 / 5.2** Assign Memberships, Expiry & Effective Access | `FR-CORE-025`, `FR-CORE-026` | `BR-009`, `BR-011`, `BR-020` | `EP-05` | `US-05.2` | `US-05.2` AC 1–4 | `BDD-05.2.1` – `BDD-05.2.2` |
| **J6 / 6.1** Subscriptions Overview & Module Cards | `FR-CORE-027` | `BR-012` | `EP-06` | `US-06.1` | `US-06.1` AC 1–4 | `BDD-06.1.1` |
| **J6 / 6.2** Per-Org Module Entitlement Matrix | `FR-CORE-028` | `BR-009`, `BR-014`, `BR-020` | `EP-06` | `US-06.2` | `US-06.2` AC 1–5 | `BDD-06.2.1` – `BDD-06.2.2` |
| **J7 / 7.1** Plan & Module Change + Proration | `FR-CORE-029` | `BR-012`, `BR-020` | `EP-07` | `US-07.1` | `US-07.1` AC 1–4 | `BDD-07.1.1` |
| **J7 / 7.2** Downgrade Safeguard Dialog | `FR-CORE-030` | `BR-012`, `BR-013`, `BR-014`, `BR-020` | `EP-07` | `US-07.2` | `US-07.2` AC 1–4 | `BDD-07.2.1` – `BDD-07.2.2` |
| **J8 / 8.1** Localization, OIDC/SSO & Quota Config | `FR-CORE-031` | `BR-004`, `BR-018`, `BR-020`, `BR-023` | `EP-08` | `US-08.1` | `US-08.1` AC 1–5 | `BDD-08.1.1` – `BDD-08.1.2` |
| **J8 / 8.1** Service Registry, API Keys & Webhooks | `FR-CORE-032`, `FR-CORE-033` | `BR-020`, `BR-022` | `EP-08` | `US-08.2` | `US-08.2` AC 1–4 | `BDD-08.2.1` – `BDD-08.2.2` |
| **J8 / 8.1 & Shell (Future)** Multi-Language Selection & Locale Extensibility | `FR-CORE-040` | `BR-017`, `BR-020`, `BR-023` | `EP-08` | `US-08.3` | `US-08.3` AC 1–5 | `BDD-08.3.1` – `BDD-08.3.3` |
| **J9 / 9.1** Audit Log Search, Filters & Export | `FR-CORE-034`, `FR-CORE-036` | `BR-003`, `BR-019`, `BR-020` | `EP-09` | `US-09.1` | `US-09.1` AC 1–5 | `BDD-09.1.1` – `BDD-09.1.2` |
| **J9 / 9.2** Audit Event Diff Inspection Drawer | `FR-CORE-035` | `BR-019`, `BR-022` | `EP-09` | `US-09.2` | `US-09.2` AC 1–4 | `BDD-09.2.1` – `BDD-09.2.2` |
| **J10 / 10.1** Notification Channels & Event Routing | `FR-CORE-037` | `BR-020`, `BR-021` | `EP-10` | `US-10.1` | `US-10.1` AC 1–5 | `BDD-10.1.1` – `BDD-10.1.2` |
| **J10 / 10.1** Delivery Logs & Async Retry | `FR-CORE-038` | `BR-020` | `EP-10` | `US-10.2` | `US-10.2` AC 1–4 | `BDD-10.2.1` |
| **J10 / 10.2** Personal Notification Preferences | `FR-CORE-039` | `BR-021` | `EP-10` | `US-10.3` | `US-10.3` AC 1–4 | `BDD-10.3.1` |

---

## 9. Gaps, Assumptions, Dependencies & Open Questions

The following items represent ambiguities or unresolved product/architecture decisions surfaced during analysis. Per scope discipline, none of these have been silently invented; each requires stakeholder sign-off before sprint commitment.

### 9.1 Open Questions & Unresolved Decisions

| Gap ID | Area | Ambiguity / Unresolved Question | Impact | Recommended Decision |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Billing & Payment Gateway | The Figma wireframes cover subscription plans, proration previews, and downgrade safeguards, while the HLD lists "Product subscriptions and feature entitlements." Does Platform Core integrate directly with a payment gateway (e.g., Razorpay/Stripe) and generate GST tax invoices, or does it act strictly as the commercial entitlement ledger updated via an external billing/CRM system? | High (changes `EP-07` checkout & dunning scope) | Treat Platform Core as the authoritative **Subscription & Entitlement Ledger** for Slice 1–2; integrate payment/GST invoicing via a dedicated adapter or external billing provider webhook once commercial ops confirms vendor selection. |
| **GAP-02** | Self-Service vs. Admin-Assisted Onboarding | `US-02.2` models Platform Super Admin onboarding a tenant. Should SMBs and CA Firms also have a public self-service registration flow (`POST /signup`) with automated 14-day trial provisioning? | High (impacts `EP-02` & anti-abuse controls) | Launch Slice 1 with Admin-assisted provisioning (`PER-01`) + invited Tenant Admin activation; add public self-service trial signup as a separate story after abuse/KYC rules are approved. |
| **GAP-03** | Managed OIDC Provider & Enterprise SSO Onboarding | The HLD specifies a "Managed OIDC/OAuth 2.0 provider" (e.g., Auth0, Cognito, Clerk, Keycloak). Which vendor will be selected, and should Enterprise tenants configure their own SAML/OIDC IdP self-service or via METRix support? | High (impacts `US-01.1`, `US-08.1`) | Finalize OIDC vendor before Sprint 1; restrict tenant-level custom IdP setup to Platform Super Admin (`PER-01`) initially. |
| **GAP-04** | Tenant Slug Mutability | Once provisioned (`kulkarni-associates.metrix.app`), can a tenant slug ever be renamed (e.g., after a merger), and if so, how are existing OIDC redirect URIs and bookmarks handled? | Medium | Keep Tenant Slug immutable in v1 (`BR-001`) and provide a separate editable `Display Name`. |
| **GAP-05** | Seat Quota Accounting for Pending Invites | Do `Invite Sent` records consume licensed seats immediately upon dispatch (preventing race-condition over-provisioning), or only upon OIDC activation? | Medium (`US-03.1`, `BR-005`) | Reserve seats upon `Invite Sent` and immediately release the seat if the invite expires or is revoked. |
| **GAP-06** | External Client Access in CA Firms | In `US-02.3` / `US-05.1`, a CA Firm may invite a client's CFO (`Client CFO — External`) to view reports on a single Client Org. Do external client stakeholders count toward the CA Firm's paid staff seats, or are they licensed under a separate "Client Viewer" quota? | Medium (CA Firm pricing model) | Confirm commercial licensing rule with Product/Pricing before implementing `BR-005` seat calculations for CA Firms. |
| **GAP-07** | Time-Bound Access Timezone Semantics | When an admin sets an organization membership expiry date (e.g., `2027-03-31`), does access terminate at `23:59:59` in the tenant's configured timezone (`Asia/Kolkata`) or in UTC? | Low–Medium (`US-05.2`, `BR-011`) | Default to `23:59:59` in the tenant's configured timezone, persisted internally as exact UTC timestamp. |
| **GAP-08** | Cross-Module Frontend Routing Architecture | The Unified Module Switcher (`US-01.4`) preserves Org Context, Pin State, and Theme across Platform Core and Tax/Payroll/CA modules. Will all four modules share a single Next.js App Router shell or run as separate micro-frontends sharing an auth/context cookie? | High (Frontend Architecture) | Use a single unified Next.js App Shell hosting module route groups (matching HLD's single `Next.js Web Frontend` box) so layout state and client navigation remain seamless. |
| **GAP-09** | "Request Access" Workflow on 403 Screen | The `403 Access Restricted` wireframe includes an optional `Request Access` CTA. Should this trigger an automated notification to the Tenant Admin, or simply show contact guidance? | Low (`US-04.3`) | In Slice 1, display `Return to Dashboard` plus Tenant Admin contact guidance; in Slice 2/3, wire `Request Access` to emit an in-app/email notification via `EP-10`. |
| **GAP-10** | SCIM / Directory Sync & Bulk User Import | Large Enterprise tenants (`Meridian Infrastructure Group`, 142+ users) may request CSV bulk user import or SCIM automated provisioning from Entra ID / Google Workspace. Not yet modeled in wireframes. | Medium (Enterprise adoption) | Keep multi-email paste in Slice 1 (`US-03.1`); log CSV user import and SCIM 2.0 sync as future backlog candidates. |
| **GAP-11** | Client Org Transfer / Offboarding (CA Firm) | If a business leaves a CA Firm and becomes an independent SMB Tenant (or moves to another CA Firm), how is organization ownership transferred across tenants? | Medium (CA Firm lifecycle) | Explicitly mark cross-tenant organization transfer out of scope for v1; handle via controlled Platform Ops migration procedure until a dedicated transfer epic is prioritized. |
| **GAP-12** | Audit Export Volume & PII Compliance | Should CSV/JSON audit exports impose a synchronous row ceiling (e.g., $10{,}000$ rows) and mask end-user IPs/emails for certain auditor roles under India DPDP Act requirements? | Medium (`US-09.1`, `NFR-PERF-02`) | Enforce synchronous cap of $10{,}000$ rows with async background export for larger ranges; confirm DPDP Act masking requirements with Legal. |
| **GAP-13** | Future Multi-Language Scope, Target Locales & Translation Governance | `FR-CORE-040`, `US-08.3`, and `NFR-I18N-02` establish future multi-language readiness. Which target languages will be prioritized first (e.g., Hindi `hi-IN`, Gujarati `gu-IN`, Marathi `mr-IN`, Tamil `ta-IN`, or international locales), is RTL script support required, who owns statutory/tax terminology translation QA, and must transactional email templates localize per recipient locale? | Medium (`FR-CORE-040`, `US-08.3`, `NFR-I18N-02`, `EP-10`) | Implement full I18N architecture readiness in Slices 1–2 (`en-IN` externalized resource bundles, `BCP-47` locale fields in schema/API, logical CSS spacing) and confirm target language list, RTL priority, and translation workflow before scheduling `US-08.3`. |

### 9.2 Key Architectural Dependencies & Assumptions
1. **Dependency — Managed OIDC Provider:** `EP-01`, `EP-03`, and `EP-08` depend on provisioning the chosen managed OIDC/OAuth 2.0 service and configuring JWT custom claims or token introspection for tenant/org context.
2. **Dependency — Downstream Service Permission & Event Contracts:** `EP-04`, `EP-06`, and `EP-09` depend on OpenAPI permission-catalog schemas and standardized domain audit event envelopes published by **Tax & Financial Intelligence**, **Payroll & HRMS**, and **CA Practice & Accounting** services.
3. **Dependency — Shared Infrastructure:** `EP-09` and `EP-10` depend on PostgreSQL (with `NUMERIC` and append-only audit tables), Redis/BullMQ for authorization caching and async notification/webhook delivery, S3-compatible storage for long-term audit archive, and OpenTelemetry instrumentation across the API Gateway and NestJS services.
4. **Dependency — Cross-Module I18N Contract:** Future multi-language activation (`US-08.3`) depends on downstream METRix frontend modules adopting the same externalized `BCP-47` locale bundle convention and reading the user's resolved locale from Platform Core's App Shell manifest (`GET /api/v1/core/me/modules`).
5. **Assumption — Reference UI Design System:** All UI components map to Tailwind CSS (`@theme inline` Light/Dark tokens) and `shadcn/ui` primitives as specified in the HLD and Figma Design System, while keeping requirements implementation-agnostic where visual details do not alter user outcomes.