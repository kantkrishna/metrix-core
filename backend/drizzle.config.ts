// drizzle.config.ts
//
// Purpose: Configures Drizzle Kit schema introspection, migration output directory, and PostgreSQL connection credentials.
//
// Context: Restricts DDL management strictly to the core schema under DATABASE_ADMIN_URL to prevent unintended changes to other schemas.
//
// Implementation Specs: drizzle-kit 0.31.11 PostgreSQL dialect targeting src/db/schema/index.ts with schemaFilter: ["core"] and strict mode.

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const adminUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
if (!adminUrl) {
  throw new Error('DATABASE_ADMIN_URL or DATABASE_URL must be configured for Drizzle Kit.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle/migrations',
  schemaFilter: ['core'],
  strict: true,
  verbose: true,
  dbCredentials: {
    url: adminUrl,
  },
});
