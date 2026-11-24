# frontend/tests/bdd/features/epic-01-ready.feature
#
# Purpose: Verifies the Cucumber.js Gherkin BDD harness is wired and ready for
# Epic 1 (EP-01) acceptance scenarios (US-01.1 through US-01.5).
#
# Context: Mirrors Section 4 of METRix-HLD-Concise-20261122.md.
#
# Implementation Specs: Executed via npm run test:bdd.

@scaffold
Feature: Platform Core Frontend BDD Harness Readiness

  Scenario: Verify en-IN default locale resolution in BDD runner
    Given the Platform Core frontend I18N resolver is initialized
    When no user or tenant locale override is provided
    Then the resolved BCP-47 locale is "en-IN"
