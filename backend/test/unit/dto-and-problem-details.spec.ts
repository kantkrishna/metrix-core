// test/unit/dto-and-problem-details.spec.ts
//
// Purpose: Unit-tests Decimal.js monetary regexes, Zod request/manifest DTOs, fail-fast env parsing, and RFC 9457 error formatting.
//
// Context: Ensures financial precision, safe boolean query coercion on GET /me/modules, and UI error extensions work without external dependencies.
//
// Implementation Specs: Vitest 5 unit suite exercising src/contracts/*, src/config/env.schema.ts, and ProblemDetailsFilter.

import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { DecimalAmountSchema, TenantSlugSchema } from '../../src/contracts/common.dto';
import {
  AccessibleModulesManifestResponseDto,
  CreateInvitationsDto,
  GetMyModulesQueryDto,
  OnboardTenantDto,
} from '../../src/contracts/platform-core.dto';
import { validateEnv } from '../../src/config/env.schema';
import { ProblemDetailsFilter } from '../../src/common/filters/problem-details.filter';

describe('Phase 3 Unit Verification — DTOs, Env Schema & RFC 9457 Filter', () => {
  it('enforces exact Decimal.js fixed-scale NUMERIC(14,2) wire format and slug constraints', () => {
    expect(DecimalAmountSchema.safeParse('240000.00').success).toBe(true);
    expect(DecimalAmountSchema.safeParse('-42684.93').success).toBe(true);
    expect(DecimalAmountSchema.safeParse('240000').success).toBe(false);
    expect(DecimalAmountSchema.safeParse('240000.123').success).toBe(false);

    expect(TenantSlugSchema.safeParse('kulkarni-associates').success).toBe(true);
    expect(TenantSlugSchema.safeParse('Meridian_Infra').success).toBe(false);
    expect(TenantSlugSchema.safeParse('-invalid').success).toBe(false);
  });

  it('validates OnboardTenantDto & CreateInvitationsDto with normalized lowercase emails', () => {
    const onboard = OnboardTenantDto.parse({
      customerType: 'CA_FIRM',
      legalName: 'Kulkarni, Deshmukh & Associates LLP',
      slug: 'kulkarni-associates',
      primaryAdmin: { fullName: 'Rohan Kulkarni', email: 'ROHAN@KDA-LLP.IN' },
      planCode: 'CA_PRACTICE_PRO',
      billingCycle: 'ANNUAL',
      initialModules: ['tax_financial', 'ca_practice'],
    });
    expect(onboard.primaryAdmin.email).toBe('rohan@kda-llp.in');

    const invite = CreateInvitationsDto.parse({
      emails: ['Ananya.Iyer@KDA-LLP.IN'],
      targetOrgRoles: [
        {
          organizationId: '30000000-0000-4000-8000-000000004412',
          roleId: '50000000-0000-4000-8000-000000000101',
          accessExpiresOn: '2027-03-31',
        },
      ],
    });
    expect(invite.emails[0]).toBe('ananya.iyer@kda-llp.in');
  });

  it('fails fast in validateEnv() when KMS key or required OIDC/DB URIs are invalid', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://metrix_app:pwd@localhost:5432/metrix_platform_core',
        OIDC_ISSUER_URL: 'https://id.metrix-erp.cloud/realms/platform-core',
        OIDC_CLIENT_ID: 'client',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_JWKS_URI: 'https://id.metrix-erp.cloud/jwks',
        OIDC_REDIRECT_URI: 'http://localhost:3000/auth/callback',
        KMS_ENVELOPE_KEY_HEX: 'too-short',
      }),
    ).toThrow(/KMS_ENVELOPE_KEY_HEX/);
  });

  it('formats 403 ForbiddenException & ZodError into RFC 9457 application/problem+json', () => {
    const filter = new ProblemDetailsFilter();
    let statusCode = 0;
    let contentType = '';
    let payload: Record<string, unknown> = {};

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      type(ct: string) {
        contentType = ct;
        return this;
      },
      json(body: Record<string, unknown>) {
        payload = body;
        return this;
      },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockRes,
        getRequest: () => ({
          originalUrl: '/api/v1/core/subscriptions/change/confirm',
          headers: { 'x-trace-id': 'trace-123' },
        }),
      }),
    };

    filter.catch(
      new ForbiddenException({
        type: 'https://metrix-erp.cloud/errors/insufficient-permission',
        title: 'Access Restricted',
        detail: 'Missing subscriptions:manage permission.',
        missingPermission: 'subscriptions:manage',
      }),
      mockHost as never,
    );
    expect(statusCode).toBe(403);
    expect(contentType).toBe('application/problem+json');
    expect(payload.missingPermission).toBe('subscriptions:manage');
    expect(payload.traceId).toBe('trace-123');

    const bad = TenantSlugSchema.safeParse('BAD_SLUG');
    expect(bad.success).toBe(false);
    if (!bad.success) {
      filter.catch(bad.error as ZodError, mockHost as never);
      expect(statusCode).toBe(400);
      expect(contentType).toBe('application/problem+json');
      expect(payload.fieldErrors).toBeDefined();
    }
  });

  it('parses GET /me/modules query params safely without coercing "false" to true', () => {
    const parsedFalse = GetMyModulesQueryDto.parse({
      organizationId: '30000000-0000-4000-8000-000000004412',
      includeLockedAddOns: 'false',
    });
    expect(parsedFalse.includeLockedAddOns).toBe(false);

    const parsedTrue = GetMyModulesQueryDto.parse({ includeLockedAddOns: 'true' });
    expect(parsedTrue.includeLockedAddOns).toBe(true);

    expect(GetMyModulesQueryDto.safeParse({ organizationId: 'invalid-uuid' }).success).toBe(false);
  });

  it('validates AccessibleModulesManifestResponseDto for scoped CA staff vs Tenant Owner add-ons', () => {
    const staffManifest = AccessibleModulesManifestResponseDto.safeParse({
      tenantId: '20000000-0000-4000-8000-000000000319',
      organizationId: '30000000-0000-4000-8000-000000004412',
      organizationCode: 'ORG-4412',
      organizationName: 'Apex Textiles Ltd.',
      contextFallback: null,
      uiPreferences: {
        userId: '10000000-0000-4000-8000-000000000003',
        uiNavPinned: true,
        uiThemeMode: 'DARK',
        lastWorkspaceTenantId: '20000000-0000-4000-8000-000000000319',
        unreadNotificationCount: 2,
      },
      modules: [
        {
          code: 'tax_financial',
          name: 'Tax & Financial Intelligence',
          description: 'Advance Tax, Income Tax, GST & scenario optimization.',
          baseUrl: '/tax',
          themeKey: 'tax',
          apiVersion: 'v1.2',
          status: 'ACTIVE',
          healthStatus: 'OPERATIONAL',
          isCoreService: false,
          permittedRoutes: ['dashboard', 'computations', 'rules'],
          effectivePermissions: ['tax.scenarios:view', 'tax.scenarios:approve'],
          featureFlags: { advanceTax: true, gst: true },
        },
      ],
      lockedAddOns: [],
      evaluatedAt: '2026-11-23T11:15:00.000Z',
    });
    expect(staffManifest.success).toBe(true);

    const ownerWithInvalidLocked = AccessibleModulesManifestResponseDto.safeParse({
      ...(staffManifest.success ? staffManifest.data : {}),
      lockedAddOns: [
        {
          code: 'ca_practice',
          name: 'CA Practice & Accounting',
          description: 'Client engagements & accounting ledgers.',
          status: 'ACTIVE',
          manageSubscriptionUrl: '/core/subscriptions',
          upgradeRequired: true,
        },
      ],
    });
    expect(ownerWithInvalidLocked.success).toBe(false);
  });
});
