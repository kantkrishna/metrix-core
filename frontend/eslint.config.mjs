// frontend/eslint.config.mjs
/*
Purpose: Defines native ESLint 10 flat configuration for Next.js 16, React 19,
TypeScript, and Core Web Vitals across metrix-core/frontend.

Context: Enforces static code quality, accessibility (jsx-a11y), and React hook
safety as part of CI gates without deprecated @eslint/eslintrc layers.

Implementation Specs: Uses defineConfig and globalIgnores from eslint/config
with eslint-config-next/core-web-vitals and eslint-config-next/typescript.
*/

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
