# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

# Copy workspace manifest and packages
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies and build web client
RUN pnpm install --frozen-lockfile && \
    pnpm --filter @bookflow/shared-types build && \
    pnpm --filter @bookflow/web build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

