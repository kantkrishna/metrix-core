// frontend/tests/bdd/steps/scaffold-readiness.steps.ts
/*
Purpose: Step definitions proving the Cucumber.js TypeScript BDD runner executes
cleanly against src/ modules before Epic 1 acceptance tests are added.

Context: Validates TypeScript loader and module resolution for tests/bdd/.

Implementation Specs: Uses @cucumber/cucumber and Node assert/strict.
*/

import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { resolveEffectiveLocale } from "../../../src/i18n/i18n-provider";

let resolvedLocale = "";

Given("the Platform Core frontend I18N resolver is initialized", () => {
  resolvedLocale = "";
});

When("no user or tenant locale override is provided", () => {
  resolvedLocale = resolveEffectiveLocale({});
});

Then("the resolved BCP-47 locale is {string}", (expected: string) => {
  assert.equal(resolvedLocale, expected);
});
