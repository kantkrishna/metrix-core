# Dockerfile
#
# Purpose: Multi-stage Docker build for the Advantax Tax METRix Platform Core NestJS microservice,
# supporting hot-reload development, one-shot database bootstrap/migrations, and hardened production runtime.
#
# Context: Runs the compiled NestJS runtime as a non-root user (node) without shipping devDependencies,
# test suites, or schema-owner credentials into the final production container image.
#
# Implementation Specs: Node 20 Alpine multi-stage build with pnpm 12.14.0 (base -> deps -> dev / builder -> migrator / prod-deps -> runner)
# preserving local scripts/shims overrides, building via tsconfig.build.json, and healthchecking via Node fetch.

# ----------------------------------------------------------------------------
# Stage 0: Base Runtime with pnpm v12.14.0 (libatomic required by pnpm 12 musl binary)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libatomic && npm install -g pnpm@12.14.0

# ----------------------------------------------------------------------------
# Stage 1: Dependency Installation (includes pnpm-workspace.yaml & local shims)
# ----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/shims ./scripts/shims
RUN pnpm install --frozen-lockfile

# ----------------------------------------------------------------------------
# Stage 2: Development Hot-Reload Target (docker-compose.dev.yml)
# ----------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.json tsconfig.build.json nest-cli.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY openapi ./openapi
COPY src ./src
EXPOSE 4001
CMD ["pnpm", "run", "start:dev"]

# ----------------------------------------------------------------------------
# Stage 3: TypeScript / NestJS Production Builder
# ----------------------------------------------------------------------------
FROM deps AS builder
COPY tsconfig.json tsconfig.build.json nest-cli.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY openapi ./openapi
COPY src ./src
RUN pnpm run build

# ----------------------------------------------------------------------------
# Stage 4: One-Shot DB Bootstrap & Migration Runner (db:push + RLS + seed)
# ----------------------------------------------------------------------------
FROM builder AS migrator
ENV NODE_ENV=development
CMD ["pnpm", "run", "db:bootstrap"]

# ----------------------------------------------------------------------------
# Stage 5: Minimal Production Dependencies Install (reuses warm pnpm store)
# ----------------------------------------------------------------------------
FROM deps AS prod-deps
RUN pnpm install --prod --frozen-lockfile

# ----------------------------------------------------------------------------
# Stage 6: Hardened Non-Root Production Runtime
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001
ENV API_PREFIX=api/v1/core

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/scripts/shims ./scripts/shims
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/openapi ./openapi

USER node
EXPOSE 4001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4001) + '/' + (process.env.API_PREFIX || 'api/v1/core') + '/health/db').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
