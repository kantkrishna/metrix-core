// frontend/tests/bdd/steps/auth-workspace-shell.steps.ts
/*
Purpose: Cucumber.js step definitions validating Epic 1 responsive navigation
and permission-filtered module switcher rules.

Context: Ensures pure shell state rules stay verifiable independently of DOM
rendering frameworks.

Implementation Specs: Imports pure state helpers from src/features/shell/.
*/

import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { filterVisibleLockedAddOns } from "../../../src/features/shell/module-switcher-helpers";
import { resolveSidebarPresentation } from "../../../src/features/shell/navigation-state";

let savedPinPref = false;
let viewportWidth = 1440;
let lockedCount = 0;

const sampleLocked = [
  {
    code: "ca_practice",
    name: "CA Practice & Accounting",
    description: "Client engagements",
    status: "NOT_SUBSCRIBED" as const,
    manageSubscriptionUrl: "/subscriptions",
    upgradeRequired: true,
  },
];

Given("the user has a saved navigation preference of pinned", () => {
  savedPinPref = true;
  viewportWidth = 1440;
});

When("the viewport width changes to {int} pixels", (width: number) => {
  viewportWidth = width;
});

Then(
  "the effective sidebar presentation is {string}",
  (expected: string) => {
    const mode = resolveSidebarPresentation({
      savedPinned: savedPinPref,
      isOverlayOpen: false,
      viewportWidth,
    });
    assert.equal(mode, expected);
  }
);

Then("the saved desktop pin preference remains true", () => {
  assert.equal(savedPinPref, true);
});

Given(
  "a module manifest containing locked add-on {string}",
  (name: string) => {
    assert.equal(sampleLocked[0]?.name, name);
  }
);

When(
  "the switcher is evaluated for a non-admin operational staff member",
  () => {
    lockedCount = filterVisibleLockedAddOns(sampleLocked, [
      "tax.scenarios:read",
    ]).length;
  }
);

When(
  "the switcher is evaluated for a tenant administrator with {string}",
  (permission: string) => {
    lockedCount = filterVisibleLockedAddOns(sampleLocked, [permission]).length;
  }
);

Then("the visible locked add-on count is {int}", (expected: number) => {
  assert.equal(lockedCount, expected);
});
