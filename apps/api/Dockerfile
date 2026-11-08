# Stage 1: Build & Prune
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

# Copy workspace manifest and configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies including devDependencies for build
RUN pnpm install --frozen-lockfile

# Generate Prisma Client & Build TypeScript artifacts
RUN pnpm --filter @bookflow/shared-types build && \
    pnpm --filter @bookflow/api db:generate && \
    pnpm --filter @bookflow/api build

# Prune non-production dependencies
RUN pnpm --filter @bookflow/api --prod deploy /app/deployed-api

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged system user
RUN addgroup -S bookflow && adduser -S bookflow -G bookflow

# Copy deployed production bundle
COPY --from=builder --chown=bookflow:bookflow /app/deployed-api ./
COPY --from=builder --chown=bookflow:bookflow /app/apps/api/dist ./dist
COPY --from=builder --chown=bookflow:bookflow /app/apps/api/prisma ./prisma

USER bookflow

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

