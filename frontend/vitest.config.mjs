// metrix-core/frontend/vitest.config.mjs
/*
Purpose: Configures Vitest 5 (native ESM) for strict Red-Green-Refactor unit
and component testing across metrix-core/frontend.

Context: Implements the automated unit/component test layer mandated by
METRix-HLD-Concise-20261122.md Section 4 with zero Vite CJS/ESM loader warnings.

Implementation Specs: Uses jsdom 31, @vitejs/plugin-react, path aliases
matching tsconfig.json, and v8 coverage reporting.
*/

import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.spec.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/app/layout.tsx"],
    },
  },
});
