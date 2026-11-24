// backend/src/common/filters/problem-details.filter.ts
//
// Purpose: Translates Zod validation errors, NestJS HTTP exceptions, and unhandled errors into RFC 9457 ProblemDetails JSON.
//
// Context: Supplies standardized missingPermission, conflictField, hardBlockers, and traceId extensions required by Platform Core UI error states.
//
// Implementation Specs: NestJS @Catch() ExceptionFilter emitting application/problem+json responses via Express.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ProblemDetails } from '../../contracts/common.dto';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = (req.headers['x-trace-id'] as string) ?? null;

    if (exception instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of exception.issues) {
        const key = issue.path.join('.') || '_root';
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      const problem: ProblemDetails = {
        type: 'https://metrix-erp.cloud/errors/validation-failed',
        title: 'Validation Failed',
        status: HttpStatus.BAD_REQUEST,
        detail: 'One or more request parameters failed contract validation.',
        instance: req.originalUrl,
        traceId,
        fieldErrors,
      };
      res.status(HttpStatus.BAD_REQUEST).type('application/problem+json').json(problem);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const obj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
      const problem: ProblemDetails = {
        type: typeof obj.type === 'string' ? obj.type : `https://metrix-erp.cloud/errors/http-${status}`,
        title: typeof obj.title === 'string' ? obj.title : exception.name,
        status,
        detail:
          typeof obj.detail === 'string'
            ? obj.detail
            : typeof obj.message === 'string'
              ? obj.message
              : exception.message,
        instance: req.originalUrl,
        traceId,
        missingPermission: typeof obj.missingPermission === 'string' ? obj.missingPermission : null,
        conflictField: typeof obj.conflictField === 'string' ? obj.conflictField : null,
        hardBlockers: Array.isArray(obj.hardBlockers) ? (obj.hardBlockers as string[]) : undefined,
      };
      res.status(status).type('application/problem+json').json(problem);
      return;
    }

    const problem: ProblemDetails = {
      type: 'https://metrix-erp.cloud/errors/internal-server-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected Platform Core error occurred.',
      instance: req.originalUrl,
      traceId,
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('application/problem+json').json(problem);
  }
}
