// metrix-core/frontend/src/lib/api/http-client.ts
/*
Purpose: Provides the centralized, tenant-aware HTTP client for communicating
with the METRix Platform Core REST API.

Context: Enforces OIDC Bearer authentication, PostgreSQL FORCE RLS context
headers (X-Tenant-Id, X-Organization-Id), BCP-47 Accept-Language propagation,
and RFC 9457 ProblemDetails error normalization.

Implementation Specs: Wraps native fetch with Zod v4 response validation and
pluggable context/token getters so unit tests can run deterministically.
*/

import type * as z from "zod";
import { publicEnv } from "@/config/env";
import {
  ApiProblemError,
  ProblemDetailsSchema,
} from "@/contracts/problem-details";

export interface RequestContext {
  accessToken?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  locale?: string | null;
}

export interface ApiRequestOptions<TResponse> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  context?: RequestContext;
  schema?: z.ZodType<TResponse>;
  signal?: AbortSignal;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export class PlatformCoreHttpClient {
  private readonly baseUrl: string;
  private readonly getDefaultContext: () => RequestContext;

  public constructor(
    baseUrl = publicEnv.NEXT_PUBLIC_PLATFORM_CORE_API_URL,
    getDefaultContext: () => RequestContext = () => ({})
  ) {
    this.baseUrl = baseUrl;
    this.getDefaultContext = getDefaultContext;
  }

  public async request<TResponse>(
    options: ApiRequestOptions<TResponse>
  ): Promise<TResponse> {
    const mergedContext: RequestContext = {
      ...this.getDefaultContext(),
      ...options.context,
    };

    const headers = new Headers({
      Accept: "application/json, application/problem+json",
    });

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (mergedContext.accessToken) {
      headers.set("Authorization", `Bearer ${mergedContext.accessToken}`);
    }
    if (mergedContext.tenantId) {
      headers.set("X-Tenant-Id", mergedContext.tenantId);
    }
    if (mergedContext.organizationId) {
      headers.set("X-Organization-Id", mergedContext.organizationId);
    }
    if (mergedContext.locale) {
      headers.set("Accept-Language", mergedContext.locale);
    }

    const url = buildUrl(this.baseUrl, options.path, options.query);
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (!response.ok) {
      const rawError = await response.json().catch(() => null);
      const parsed = ProblemDetailsSchema.safeParse(rawError);
      if (parsed.success) {
        throw new ApiProblemError(parsed.data);
      }
      throw new ApiProblemError({
        type: "about:blank",
        title: response.statusText || "Request Failed",
        status: response.status,
        detail: `Request failed with HTTP status ${response.status}.`,
      });
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const json: unknown = await response.json();
    return options.schema ? options.schema.parse(json) : (json as TResponse);
  }
}

export const platformCoreApi = new PlatformCoreHttpClient();
