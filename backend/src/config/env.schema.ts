// backend/src/config/env.schema.ts
//
// Purpose: Defines and validates all runtime environment variables required by the Platform Core microservice.
//
// Context: Prevents insecure startup by enforcing valid URIs for PostgreSQL/OIDC and a strict 64-hex-character (32-byte) KMS envelope key.
//
// Implementation Specs: Zod v4 object schema exporting envSchema, AppEnv type, and validateEnv() helper.

import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  API_PREFIX: z.string().min(1).default('api/v1/core'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  DATABASE_ADMIN_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URI'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  OIDC_ISSUER_URL: z.string().url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_JWKS_URI: z.string().url(),
  OIDC_REDIRECT_URI: z.string().url(),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379/0'),
  BULLMQ_PREFIX: z.string().min(1).default('metrix:core'),

  KMS_ENVELOPE_KEY_HEX: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'KMS_ENVELOPE_KEY_HEX must be a 64-character hex string (32 bytes)'),

  OTEL_SERVICE_NAME: z.string().min(1).default('metrix-platform-core-service'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  OIDC_DEV_MOCK_ENABLED: z
    .enum(["true", "false"])
    .default("false"),

});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid Platform Core environment configuration:\n${details}`);
  }
  return parsed.data;
}
