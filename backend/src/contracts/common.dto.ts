// backend/src/contracts/common.dto.ts
//
// Purpose: Defines reusable primitive, temporal, monetary, pagination, and RFC 9457 error Zod schemas.
//
// Context: Enforces exact fixed-scale Decimal.js monetary strings, ISO calendar dates, wall-clock digest times, and structured UI error extensions.
//
// Implementation Specs: Zod v4 schemas for DecimalAmountSchema, IsoDateSchema, LocalWallTimeSchema, TenantSlugSchema, pagination queries, and ProblemDetailsSchema.

import { z } from 'zod';

export const DecimalAmountSchema = z
  .string()
  .regex(/^-?\d{1,12}\.\d{2}$/, 'Monetary amount must be an exact fixed-scale decimal string (e.g., 240000.00)');

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid YYYY-MM-DD calendar date');

export const LocalWallTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Must be a valid 24-hour wall time (HH:MM:SS)');

export const TenantSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single hyphen separators');

export const OffsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
});

export const ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  traceId: z.string().nullable().optional(),
  missingPermission: z.string().nullable().optional(),
  conflictField: z.string().nullable().optional(),
  hardBlockers: z.array(z.string()).optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
