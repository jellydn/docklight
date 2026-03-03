# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
project-root/
├── server/ # Express backend with TypeScript
│   ├── lib/ # Core business logic and utilities
│   ├── routes/ # API route handlers
│   ├── data/ # SQLite database storage (gitignored)
│   └── index.ts # Server entry point
├── client/ # React + Vite frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/ # Page-level components
│   │   ├── contexts/ # React contexts
│   │   ├── hooks/ # Custom React hooks
│   │   ├── lib/ # Client utilities
│   │   └── main.tsx # Client entry point
│   ├── e2e/ # Playwright end-to-end tests
│   └── public/ # Static assets
├── .github/ # GitHub Actions workflows
│   └── workflows/ # CI/CD pipelines
└── docs/ # Additional documentation
```

## Directory Purposes

**server/:**
- Purpose: Express.js backend API server
- Contains: Route handlers, business logic, database operations, SSH execution
- Key files: `server/index.ts`, `server/lib/db.ts`, `server/lib/executor.ts`

**server/lib/:**
- Purpose: Core business logic and shared utilities
- Contains: Dokku command executors, database operations, authentication, WebSocket handling
- Key files: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/executor.ts`

**server/routes/:**
- Purpose: Express HTTP route handlers organized by feature
- Contains: Auth, apps, databases, plugins, users, health endpoints
- Key files: `server/routes/apps.ts`, `server/routes/auth.ts`, `server/routes/health.ts`

**client/src/:**
- Purpose: React frontend application source
- Contains: Components, pages, contexts, hooks, utilities
- Key files: `client/src/main.tsx`, `client/src/App.tsx`

**client/src/components/:**
- Purpose: Reusable UI components and page-specific components
- Contains: AppLayout, CreateAppDialog, audit filters, UI primitives (button, card, dialog)
- Key files: `client/src/components/AppLayout.tsx`, `client/src/components/CreateAppDialog.tsx`

**client/src/pages/:**
- Purpose: Route-level page components
- Contains: Dashboard, Apps, AppDetail, Databases, Plugins, Audit, Users, Login
- Key files: `client/src/pages/Apps.tsx`, `client/src/pages/AppDetail/index.tsx`

**client/src/lib/:**
- Purpose: Client-side utilities and API client
- Contains: API client, validation schemas, command utilities
- Key files: `client/src/lib/api.ts`, `client/src/lib/schemas.ts`

**.github/workflows/:**
- Purpose: GitHub Actions CI/CD pipelines
- Contains: CI checks, production deployment, staging deployment
- Key files: `.github/workflows/ci.yml`, `.github/workflows/deploy-production.yml`

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server entry point
- `client/src/main.tsx`: React client entry point
- `server/index.ts`: Docker container entry point

**Configuration:**
- `server/tsconfig.json`: Server TypeScript config
- `client/tsconfig.json`: Client TypeScript config
- `server/biome.json`: Server linting/formatting rules
- `client/biome.json`: Client linting/formatting rules
- `server/vitest.config.ts`: Server test config
- `client/vitest.config.ts`: Client test config
- `client/playwright.config.ts`: E2E test config
- `client/vite.config.ts`: Vite dev server config
- `justfile`: Task runner commands

**Core Logic:**
- `server/lib/executor.ts`: SSH command execution with pooling
- `server/lib/db.ts`: SQLite database operations
- `server/lib/auth.ts`: JWT authentication
- `server/lib/websocket.ts`: WebSocket log streaming
- `server/lib/dokku.ts`: Dokku CLI command builders

**Testing:**
- `server/**/*.test.ts`: Server unit/integration tests (co-located)
- `client/src/**/*.test.tsx`: Client component tests (co-located)
- `client/e2e/*.spec.ts`: Playwright E2E tests

## Naming Conventions

**Files:**
- kebab-case: `app-deployment.ts`, `create-user.ts`, `audit-filters.tsx`
- Test files: Same name with `.test.ts` or `.test.tsx` suffix

**Directories:**
- kebab-case: `app-detail/`, `docker-options/`

**Functions:**
- camelCase: `getApps`, `executeCommand`, `isValidAppName`

**Components:**
- PascalCase: `AppLayout`, `CreateAppDialog`, `RequireAdmin`

**Types/Interfaces:**
- PascalCase: `CommandResult`, `App`, `AppDetail`

**Constants:**
- SCREAMING_SNAKE_CASE: `INVALID_NAME_ERROR`, `MAX_RETRIES`

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/[feature].ts` (business logic)
- API routes: `server/routes/[feature].ts`
- Tests: `server/lib/[feature].test.ts`
- Client pages: `client/src/pages/[Feature].tsx`
- Client tests: `client/src/pages/[Feature].test.tsx`

**New Component/Module:**
- Implementation: `client/src/components/[ComponentName].tsx`
- Tests: `client/src/components/[ComponentName].test.tsx`

**Utilities:**
- Shared helpers: `server/lib/[utility].ts` (server) or `client/src/lib/[utility].ts` (client)

**New Dokku Command:**
- Command builder: Add to `server/lib/dokku.ts` (DokkuCommands class)
- Executor: Use via `executeCommand()` from `server/lib/executor.ts`

## Special Directories

**server/data/:**
- Purpose: SQLite database storage location
- Generated: Yes (database created at runtime)
- Committed: No (gitignored)

**server/dist/:**
- Purpose: Compiled JavaScript output
- Generated: Yes (via `tsc`)
- Committed: No (gitignored)

**client/dist/:**
- Purpose: Built React application
- Generated: Yes (via `vite build`)
- Committed: No (gitignored)

**client/test-results/:**
- Purpose: Playwright test output
- Generated: Yes (via E2E test runs)
- Committed: No (gitignored)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (via package manager)
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-04*
