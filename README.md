# BookFlow — Realistic Ebook Reader

> A modern, production-ready ebook management and reading web application designed for focused, authentic reading on desktop, tablet, and mobile.

---

## 1. Pinned Versions & Dependency Policy

### Dependency Management Policy

- **Manifests (`package.json`)**: Controlled semantic ranges (`^` for libraries, `~` for TypeScript) to allow non-breaking patch/minor upgrades.
- **Reproducibility Mechanism (`pnpm-lock.yaml`)**: Strict lockfile pinned versions enforced via `pnpm install --frozen-lockfile` across local development and CI.

| Technology           | Manifest Range | Locked Pin    | Notes                                                       |
| :------------------- | :------------- | :------------ | :---------------------------------------------------------- |
| **Node.js**          | `22.14.0`      | `22.14.0 LTS` | Pinned in `.node-version`, `.nvmrc`, `package.json#engines` |
| **pnpm**             | `11.21.0`      | `11.21.0`     | Pinned via `packageManager` in `package.json`               |
| **TypeScript**       | `~5.7.3`       | `5.7.3`       | Strict mode across all monorepo packages                    |
| **NestJS**           | `^10.4.15`     | `10.4.15`     | Backend modular REST framework                              |
| **Prisma ORM**       | `^5.22.0`      | `5.22.0`      | PostgreSQL type-safe ORM & migration engine                 |
| **PostgreSQL**       | `16-alpine`    | `16-alpine`   | Containerized database service (`docker-compose.yml`)       |
| **React**            | `^18.3.1`      | `18.3.1`      | Modern frontend UI library                                  |
| **Vite**             | `^6.4.3`       | `6.4.3`       | Fast frontend build tool and dev server                     |
| **Tailwind CSS**     | `^3.4.17`      | `3.4.17`      | PostCSS integration with custom reader palettes             |
| **TanStack Query**   | `^5.66.0`      | `5.66.0`      | Server state management & caching                           |
| **Zustand**          | `^5.0.3`       | `5.0.3`       | Lightweight UI state (theme, sidebar)                       |
| **Jest / Supertest** | `^29.7.0`      | `29.7.0`      | API unit & E2E integration test runner                      |
| **Vitest**           | `^3.2.7`       | `3.2.7`       | Frontend component & store test runner                      |

---

## 2. Monorepo Architecture

```text
bookflow/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI workflow with PostgreSQL service
├── apps/
│   ├── api/                       # NestJS REST API application (Port 3000)
│   │   ├── prisma/
│   │   │   ├── migrations/        # Committed SQL migrations (000000_init)
│   │   │   └── schema.prisma      # Domain models with UUIDs & indexes
│   │   ├── src/
│   │   │   ├── common/            # Filters, interceptors, middleware (Request-ID)
│   │   │   ├── config/            # Class-validator environment configuration
│   │   │   ├── database/          # PrismaService & connection lifecycle
│   │   │   ├── health/            # Liveness (/health) and Readiness (/ready) probes
│   │   │   ├── app.module.ts
│   │   │   └── main.ts            # Swagger docs at /api/docs, CORS, Global pipes
│   │   └── test/                  # E2E health test suite (Supertest)
│   └── web/                       # React 18 + Vite frontend application (Port 5173)
│       ├── src/
│       │   ├── app/               # Providers & root App
│       │   ├── components/        # UI components, Layout, and ApiHealthStatus
│       │   ├── pages/             # HomePage & NotFoundPage
│       │   ├── routes/            # React Router v6 definitions
│       │   ├── services/          # Typed API fetch client with error handling
│       │   ├── stores/            # Zustand UI store (light/sepia/dark theme)
│       │   ├── styles/            # Tailwind CSS design system tokens
│       │   └── test/              # Vitest + React Testing Library tests
├── packages/
│   ├── eslint-config/             # Shared ESLint configs (base, nest, react)
│   ├── shared-types/              # Zero-leakage API contracts, DTOs & enums
│   └── tsconfig/                  # Base, Node, and React tsconfig presets
├── docker-compose.yml             # PostgreSQL 16 container with healthchecks (Port 5432)
├── .env.example                   # Environment configuration template (untracked .env)
├── .editorconfig                  # Code formatting guidelines
├── .node-version / .nvmrc         # Pinned Node runtime
├── pnpm-lock.yaml                 # Deterministic dependency graph
├── pnpm-workspace.yaml            # pnpm workspace definition
└── package.json                   # Root orchestrator scripts
```

---

## 3. Workspace Boundaries & Separation of Concerns

1. **Frontend Isolation**: `apps/web` depends strictly on `@bookflow/shared-types`. It does **not** import from `apps/api` or `@prisma/client`.
2. **Shared Types Integrity**: `packages/shared-types` contains pure TypeScript API contracts, DTOs, response envelopes, and canonical enums. It has zero runtime dependencies on Prisma or NestJS.
3. **Database Encapsulation**: Prisma models and database entity representations remain encapsulated inside `apps/api/src/database`.

---

## 4. Quick Start & Prerequisites

### Prerequisites

- **Node.js**: `v22.14.0` (LTS)
- **pnpm**: `v11.21.0` (`corepack enable` or `npm install -g pnpm@11.21.0`)
- **Docker & Docker Compose** (for PostgreSQL)

### Setup Instructions

1. **Install dependencies using frozen lockfile**:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Configure Environment Variables**:

   ```bash
   cp .env.example .env
   ```

   > **Safety Note**: `.env` is ignored by Git. Only `.env.example` containing dummy development values is committed.

3. **Start PostgreSQL Database**:

   ```bash
   docker compose up -d postgres
   ```

   Verify container health:

   ```bash
   docker compose ps
   ```

4. **Generate Prisma Client and Run Migrations**:

   ```bash
   pnpm db:generate
   pnpm db:migrate:deploy
   ```

5. **Start Development Servers**:
   ```bash
   pnpm dev
   ```
   - **API Backend**: `http://localhost:3000/api/v1`
   - **Swagger Docs**: `http://localhost:3000/api/docs`
   - **Frontend Web**: `http://localhost:5173`

---

## 5. Developer Commands Reference

### Monorepo Orchestration

| Command             | Description                                                |
| :------------------ | :--------------------------------------------------------- |
| `pnpm dev`          | Starts API and Web dev servers in parallel watch mode      |
| `pnpm dev:api`      | Starts only the NestJS API dev server                      |
| `pnpm dev:web`      | Starts only the Vite Web frontend dev server               |
| `pnpm build`        | Builds `shared-types`, `api`, and `web` production bundles |
| `pnpm lint`         | Runs ESLint across all workspaces                          |
| `pnpm typecheck`    | Runs TypeScript compiler checks (`tsc --noEmit`)           |
| `pnpm test`         | Runs unit tests across all workspaces                      |
| `pnpm test:e2e`     | Runs NestJS end-to-end test suite                          |
| `pnpm format`       | Formats all source files using Prettier                    |
| `pnpm format:check` | Verifies formatting compliance with Prettier               |

### Database & Migrations

| Command                  | Description                                               |
| :----------------------- | :-------------------------------------------------------- |
| `pnpm db:generate`       | Generates the Prisma Client (`@prisma/client`)            |
| `pnpm db:validate`       | Validates `schema.prisma` syntax and relation integrity   |
| `pnpm db:migrate`        | Runs migration creator in dev mode (`prisma migrate dev`) |
| `pnpm db:migrate:deploy` | Applies pending migrations (`prisma migrate deploy`)      |
| `pnpm db:studio`         | Launches Prisma Studio visual database GUI                |

---

## 6. API Contracts & Operations

### Standard Response Envelope

Successful HTTP requests return wrapped payloads:

```json
{
  "data": {
    "status": "ok",
    "uptime": 42.5,
    "timestamp": "2026-08-15T12:00:00.000Z"
  }
}
```

### Standard Error Format

All exceptions return uniform error bodies with request tracking:

```json
{
  "statusCode": 503,
  "code": "SERVICE_UNAVAILABLE",
  "message": "Database connection check failed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Validation failures return structured error details:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed for the request payload.",
  "errors": [{ "field": "email", "message": "email must be a valid email address" }],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Health Probes

- **Liveness (`GET /api/v1/health`)**: Lightweight check verifying the API process is alive. Does not depend on PostgreSQL.
- **Readiness (`GET /api/v1/ready`)**: Probes database connectivity (`SELECT 1`). Returns HTTP 200 when PostgreSQL is available, or HTTP 503 when disconnected.

---

## 7. Troubleshooting Guide

1. **Docker PostgreSQL Port Conflict (`5432 in use`)**:
   If a local PostgreSQL instance is running on port 5432, stop it or update `POSTGRES_PORT` and `DATABASE_URL` in `.env`.
2. **Database Container Not Ready**:
   Run `docker compose logs postgres` to inspect database initialization logs.
3. **Prisma Client Missing**:
   Run `pnpm db:generate` to regenerate the Prisma client after pulling schema changes.
4. **Frozen Lockfile Mismatch**:
   If dependencies changed, run `pnpm install` locally to update `pnpm-lock.yaml`.

---

## 8. Phased Implementation Roadmap

- [x] **Phase 1 — Foundation** (Monorepo, NestJS, React, Prisma, Health Probes, CI)
- [x] **Phase 2 — Authentication & Users** (Argon2id, Session Rotation, In-Memory JWT, CSRF Defense)
- [x] **Phase 3 — Ebook Library & Storage** (Magic-byte Validation, EPUB/PDF Parsers, Storage Abstraction, Library UI)
- [ ] **Phase 4 — EPUB Reader (EPUB.js, Two-page spreads, CFI)**
- [ ] **Phase 5 — PDF Reader (PDF.js, Two-page spreads, Zoom)**
- [ ] **Phase 6 — Bookmarks & Dashboard**
- [ ] **Phase 7 — Hardening, E2E & Production Packaging**
