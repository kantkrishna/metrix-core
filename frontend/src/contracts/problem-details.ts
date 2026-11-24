// metrix-core/frontend/src/contracts/problem-details.ts
/*
Purpose: Models RFC 9457 application/problem+json error payloads returned by
Platform Core REST APIs.

Context: Surfaces missingPermission (403), conflictField (409), hardBlockers
(422), and OpenTelemetry traceId for actionable enterprise UI error states.

Implementation Specs: Validates wire errors with Zod v4 and wraps them in a
typed ApiProblemError subclass of Error.
*/

import * as z from "zod";

export const ProblemDetailsSchema = z.object({
  type: z.string(),
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

export class ApiProblemError extends Error {
  public readonly problem: ProblemDetails;

  public constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = "ApiProblemError";
    this.problem = problem;
  }

  public get status(): number {
    return this.problem.status;
  }

  public get missingPermission(): string | null {
    return this.problem.missingPermission ?? null;
  }

  public get traceId(): string | null {
    return this.problem.traceId ?? null;
  }
}
