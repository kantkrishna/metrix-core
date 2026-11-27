// test/contract/openapi-alignment.spec.ts
//
// Purpose: Verifies OpenAPI 3.1 contract completeness, 30-enum Drizzle/Zod parity, non-null audit fields, and code header standards.
//
// Context: Catches schema drift, broken $ref pointers, invalid YAML flow sequences, or missing file headers before integration tests run.
//
// Implementation Specs: Vitest 5 contract test suite scanning openapi-platform-core-v1.yaml, Drizzle schema, Zod enums, and repository code files.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const yamlText = readFileSync(resolve('openapi/openapi-platform-core-v1.yaml'), 'utf8');
const enumsText = readFileSync(resolve('src/contracts/enums.ts'), 'utf8');
const drizzleText = readFileSync(resolve('src/db/schema/platform-core.ts'), 'utf8');

function collectCodeFiles(dir: string, root: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === 'pnpm-lock.yaml') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectCodeFiles(full, root, acc);
    } else {
      const rel = relative(root, full).split(sep).join('/');
      const ext = extname(rel);
      if (['.ts', '.js', '.mjs', '.sql', '.yaml', '.yml'].includes(ext) || rel === '.env.example') {
        acc.push(rel);
      }
    }
  }
  return acc;
}

describe('Phase 3 Contract Verification — OpenAPI 3.1 & Drizzle Parity', () => {
  it('declares OpenAPI 3.1.0, /api/v1/core base path, security schemes & valid YAML 1.2 parameter refs', () => {
    expect(yamlText).toMatch(/^openapi:\s*3\.1\.0/m);
    expect(yamlText).toContain('/api/v1/core');
    expect(yamlText).toContain('oidcBearer:');
    expect(yamlText).toContain('apiKeyHeader:');
    expect(yamlText).not.toMatch(/parameters:\s*\[\$ref:/);
  });

  it('covers all 64 paths and 75 unique operationIds across all 10 UI journeys + App Shell', () => {
    const paths = yamlText.match(/^  \/[a-zA-Z0-9\-\/{}]+:$/gm) ?? [];
    const ops = yamlText.match(/^      operationId:\s+([a-zA-Z0-9_]+)$/gm) ?? [];
    const ids = ops.map((l) => l.split(':')[1].trim());
    expect(paths.length).toBe(64);
    expect(ids.length).toBe(75);
    expect(new Set(ids).size).toBe(75);
  });

  it('defines GET /me/modules with OIDC context headers, RLS metadata, RFC 9457 errors & manifest schema', () => {
    expect(yamlText).toContain('  /me/modules:');
    expect(yamlText).toContain('operationId: getMyAccessibleModules');
    expect(yamlText).toContain('x-required-permission: authenticated');
    expect(yamlText).toContain('x-rls-scope: TENANT_AND_ORG');
    expect(yamlText).toContain('#/components/schemas/AccessibleModulesManifestResponse');
    expect(yamlText).toContain('    AccessibleModuleItem:');
    expect(yamlText).toContain('    LockedModuleAddOn:');
  });

  it('resolves 100% of component $ref pointers with zero broken references', () => {
    const defined: Record<string, Set<string>> = {
      schemas: new Set(),
      parameters: new Set(),
      responses: new Set(),
    };
    let sec: string | null = null;
    for (const line of yamlText.split(/\r?\n/)) {
      if (/^  (schemas|parameters|responses):$/.test(line)) sec = line.trim().replace(':', '');
      else if (/^  [a-zA-Z]+:$/.test(line)) sec = null;
      else if (sec) {
        const m = line.match(/^    ([A-Za-z0-9_]+):(?:\s|$)/);
        if (m) defined[sec].add(m[1]);
      }
    }
    const refs = [...yamlText.matchAll(/\$ref:\s*"#\/components\/([a-zA-Z]+)\/([a-zA-Z0-9_]+)"/g)];
    const broken = refs.filter(([, s, n]) => !defined[s]?.has(n));
    expect(refs.length).toBeGreaterThan(200);
    expect(broken).toEqual([]);
  });

  it('maintains 30/30 enum parity across Drizzle, Zod, and OpenAPI YAML', () => {
    const zodEnums = [...enumsText.matchAll(/export const ([A-Za-z]+)Schema = z\.enum\(\[([^\]]+)\]\)/g)];
    const drizzleEnums = [...drizzleText.matchAll(/coreSchema\.enum\('([^']+)',\s*\[([^\]]+)\]\)/g)];
    expect(zodEnums.length).toBe(30);
    expect(drizzleEnums.length).toBe(30);

    for (const [, name, raw] of zodEnums) {
      const vals = raw.replace(/['\s]/g, '').split(',').filter(Boolean).join(', ');
      expect(yamlText).toContain(`    ${name}:\n      type: string\n      enum: [${vals}]`);
    }
  });

  it('enforces non-null createdBy & updatedBy across Drizzle and OpenAPI contracts', () => {
    expect(drizzleText).toContain("createdBy: uuid('created_by').notNull()");
    expect(drizzleText).toContain("updatedBy: uuid('updated_by').notNull()");
    expect(yamlText).toContain('required: [createdBy, createdAt, updatedBy, updatedAt]');
    expect(yamlText).toContain('retentionUntilOn, createdBy, createdAt]');
  });

  it('enforces standardized relative-path + Purpose/Context/Implementation Specs header comments on every code file', () => {
    const root = resolve('.');
    const codeFiles = collectCodeFiles(root, root);
    expect(codeFiles.length).toBeGreaterThanOrEqual(35);

    const violations: string[] = [];
    for (const rel of codeFiles) {
      const ext = extname(rel);
      const prefix =
        ext === '.sql'
          ? '--'
          : ['.yaml', '.yml'].includes(ext) || rel === '.env.example'
            ? '#'
            : '//';
      const head = readFileSync(join(root, rel), 'utf8')
        .split(/\r?\n/)
        .slice(0, 20)
        .join('\n');
      const hasFirstLine =
        head.startsWith(`${prefix} backend/${rel}\n`) ||
        head.startsWith(`${prefix} ${rel}\n`);
      const hasPurpose = head.includes(`\n${prefix}\n${prefix} Purpose: `);
      const hasContext = head.includes(`\n${prefix}\n${prefix} Context: `);
      const hasSpecs = head.includes(
        `\n${prefix}\n${prefix} Implementation Specs: `
      );
      if (!hasFirstLine || !hasPurpose || !hasContext || !hasSpecs) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
