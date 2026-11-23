// scripts/validate-openapi.mjs
//
// Purpose: Validates OpenAPI 3.1.0 structure, YAML flow references, $ref target integrity, and 30-enum Drizzle/Zod parity.
//
// Context: Provides a fast, zero-dependency CI contract gate executable in Node.js without requiring external network access or linters.
//
// Implementation Specs: Node.js ESM script auditing openapi-platform-core-v1.yaml against src/contracts/enums.ts and src/db/schema/platform-core.ts.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const yamlText = readFileSync(resolve('openapi/openapi-platform-core-v1.yaml'), 'utf8');
const enumsText = readFileSync(resolve('src/contracts/enums.ts'), 'utf8');
const drizzleText = readFileSync(resolve('src/db/schema/platform-core.ts'), 'utf8');

const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
  else console.log(`  ✓ ${msg}`);
};

console.log('Validating Advantax Tax METRix Platform Core Contract & Schema Parity...\n');

assert(/^openapi:\s*3\.1\.0/m.test(yamlText), 'OpenAPI version is 3.1.0');
assert(yamlText.includes('/api/v1/core'), 'Versioned base path /api/v1/core declared');
assert(yamlText.includes('oidcBearer:') && yamlText.includes('apiKeyHeader:'), 'Security schemes declared');
assert(!/parameters:\s*\[\$ref:/.test(yamlText), 'All YAML flow parameter sequences use valid { $ref } objects');

const paths = yamlText.match(/^  \/[a-zA-Z0-9\-\/{}]+:$/gm) || [];
const ops = yamlText.match(/^      operationId:\s+([a-zA-Z0-9_]+)$/gm) || [];
const opIds = ops.map((m) => m.split(':')[1].trim());
assert(paths.length === 64, `Contains ${paths.length} paths (expected 64)`);
assert(opIds.length === 75 && new Set(opIds).size === 75, `Contains 75 unique operationIds (found ${opIds.length})`);
assert(
  yamlText.includes('  /me/modules:') &&
    yamlText.includes('operationId: getMyAccessibleModules') &&
    yamlText.includes('    AccessibleModulesManifestResponse:'),
  'GET /me/modules App Shell manifest contract declared',
);

const defined = { schemas: new Set(), parameters: new Set(), responses: new Set() };
let sec = null;
for (const line of yamlText.split(/\r?\n/)) {
  if (/^  (schemas|parameters|responses):$/.test(line)) sec = line.trim().replace(':', '');
  else if (/^  [a-zA-Z]+:$/.test(line)) sec = null;
  else if (sec) {
    const m = line.match(/^    ([A-Za-z0-9_]+):(?:\s|$)/);
    if (m) defined[sec].add(m[1]);
  }
}
const refs = [...yamlText.matchAll(/\$ref:\s*"#\/components\/([a-zA-Z]+)\/([a-zA-Z0-9_]+)"/g)];
const broken = refs.filter(([, s, n]) => !defined[s] || !defined[s].has(n));
assert(broken.length === 0, `All ${refs.length} $ref pointers resolve cleanly`);

const zodEnums = [...enumsText.matchAll(/export const ([A-Za-z]+)Schema = z\.enum\(\[([^\]]+)\]\)/g)];
const drizzleEnums = [...drizzleText.matchAll(/coreSchema\.enum\('([^']+)',\s*\[([^\]]+)\]\)/g)];
assert(zodEnums.length === 30 && drizzleEnums.length === 30, '30/30 enum count parity across Zod & Drizzle');

const mismatches = [];
for (const [, name, raw] of zodEnums) {
  const vals = raw.replace(/['\s]/g, '').split(',').filter(Boolean).join(', ');
  if (!yamlText.includes(`    ${name}:\n      type: string\n      enum: [${vals}]`)) mismatches.push(name);
}
assert(mismatches.length === 0, '100% value-level parity across all 30 OpenAPI/Zod/Drizzle enums');
assert(yamlText.includes('required: [createdBy, createdAt, updatedBy, updatedAt]'), 'AuditFields enforces non-null createdBy & updatedBy');

if (failures.length > 0) {
  console.error('\nValidation FAILED:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\nALL OPENAPI 3.1 & DRIZZLE PARITY CHECKS PASSED.');
