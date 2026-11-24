// frontend/cucumber.mjs
/*
Purpose: Configures Cucumber.js v13 for business-readable Gherkin BDD acceptance
testing aligned with requirements.md scenarios.

Context: Supports Section 4.1 of METRix-HLD-Concise-20261122.md (Cucumber.js +
Gherkin + Playwright).

Implementation Specs: Assigns the default Cucumber profile to a named constant
before exporting default (satisfies import/no-anonymous-default-export).
*/

const cucumberConfig = {
  paths: ["tests/bdd/features/**/*.feature"],
  import: ["tests/bdd/steps/**/*.ts"],
  format: ["progress-bar", "summary"],
};

export default cucumberConfig;
