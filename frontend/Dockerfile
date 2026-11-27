# frontend/Dockerfile
#
# Purpose: Builds a minimal, non-root production container image for the
# METRix Platform Core Next.js frontend.
#
# Context: Enables independent microservice frontend deployment per
# METRix-HLD-Concise-20261122.md Section 1 & 2.2.
#
# Implementation Specs: Multi-stage Node 24 LTS Alpine build with pnpm 12.14.0
# leveraging Next.js standalone server output on port 3000.

FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libatomic && npm install -g pnpm@12.14.0

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
