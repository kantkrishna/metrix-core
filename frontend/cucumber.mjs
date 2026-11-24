// metrix-core/frontend/cucumber.mjs
/*
Purpose: Configures Cucumber.js v13 for business-readable Gherkin BDD acceptance
testing aligned with requirements.md scenarios.

Context: Supports Section 4.1 of METRix-HLD-Concise-20261122.md (Cucumber.js +
Gherkin + Playwright).

Implementation Specs: Exports the default Cucumber profile directly (in ESM
.mjs configs, export default maps to the "default" profile).
*/

export default {
  paths: ["tests/bdd/features/**/*.feature"],
  import: ["tests/bdd/steps/**/*.ts"],
  format: ["progress-bar", "summary"],
};
