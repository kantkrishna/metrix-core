// vitest.config.mjs
//
// Purpose: Configures the Vitest test runner for unit, contract, and Testcontainers integration test suites.
//
// Context: Uses native ESM (.mjs) to eliminate Vite CJS configLoader warnings while enforcing serial worker execution for PostgreSQL container stability.
//
// Implementation Specs: Vitest 5, Node environment, 120s container hook/test timeouts, fileParallelism: false, maxWorkers: 1.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    maxWorkers: 1,
    include: ['test/**/*.spec.ts'],
  },
});
