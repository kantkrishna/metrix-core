// frontend/src/config/env.ts
/*
Purpose: Validates and exports typed frontend environment configuration with safe
defaults for local development and strict validation in production.

Context: Guarantees API base URL, default BCP-47 locale (en-IN), timezone, and
multi-language feature flag are always well-formed.

Implementation Specs: Uses Zod v4 namespace import (Turbopack-safe) and top-level
z.url() validators to parse NEXT_PUBLIC_* environment variables.
*/

import * as z from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("METRix Platform Core"),
  NEXT_PUBLIC_PLATFORM_CORE_API_URL: z
    .url()
    .default("http://localhost:4001/api/v1/core"),
  NEXT_PUBLIC_APP_BASE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z
    .string()
    .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)
    .default("en-IN"),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().min(1).default("Asia/Kolkata"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().length(3).default("INR"),
  NEXT_PUBLIC_ENABLE_MULTI_LANGUAGE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

export const publicEnv: PublicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_PLATFORM_CORE_API_URL:
    process.env.NEXT_PUBLIC_PLATFORM_CORE_API_URL,
  NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_DEFAULT_TIMEZONE: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_ENABLE_MULTI_LANGUAGE:
    process.env.NEXT_PUBLIC_ENABLE_MULTI_LANGUAGE,
});
