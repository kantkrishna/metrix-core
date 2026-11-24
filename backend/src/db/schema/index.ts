// backend/src/db/schema/index.ts
//
// Purpose: Re-exports all Platform Core Drizzle tables, enums, and relation definitions from a single entrypoint.
//
// Context: Consumed by Drizzle Kit configuration, the pooled DB client, and automated test suites.
//
// Implementation Specs: TypeScript barrel module re-exporting ./platform-core and ./relations.

export * from './platform-core';
export * from './relations';
