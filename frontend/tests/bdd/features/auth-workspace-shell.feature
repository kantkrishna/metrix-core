# metrix-core/frontend/tests/bdd/features/auth-workspace-shell.feature
#
# Purpose: Business-readable Gherkin acceptance scenarios for Epic 1 (EP-01)
# covering navigation persistence, responsive overrides, and module switcher
# entitlement filtering.
#
# Context: Mirrors BDD-01.3.2, BDD-01.4.2, and BDD-01.5.2 in requirements.md.
#
# Implementation Specs: Executed via npm run test:bdd (Cucumber.js 13 + tsx).

@auth-shell
Feature: Unified App Shell Navigation, Module Switcher & Org Fallback

  Scenario: Responsive viewport overrides pinned sidebar without mutating saved preference
    Given the user has a saved navigation preference of pinned
    When the viewport width changes to 900 pixels
    Then the effective sidebar presentation is "hidden"
    And the saved desktop pin preference remains true
    When the viewport width changes to 1440 pixels
    Then the effective sidebar presentation is "pinned"

  Scenario: Gated add-on modules are visible only to entitlement administrators
    Given a module manifest containing locked add-on "CA Practice & Accounting"
    When the switcher is evaluated for a non-admin operational staff member
    Then the visible locked add-on count is 0
    When the switcher is evaluated for a tenant administrator with "subscriptions:manage"
    Then the visible locked add-on count is 1
