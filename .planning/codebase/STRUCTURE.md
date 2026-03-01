# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
[docklight-root]/
├── client/ # React SPA frontend
├── server/ # Express backend
├── data/ # SQLite database storage
├── .github/ # GitHub Actions workflows
├── .planning/ # Project planning documents
├── docs/ # Additional documentation
├── scripts/ # Build/utility scripts
└── tasks/ # Task definitions
```

## Directory Purposes

**client/:**
- Purpose: React single-page application frontend
- Contains: React components, pages, API client, styling, tests
- Key files: `src/main.tsx`, `src/App.tsx`, `src/lib/api.ts`

**server/:**
- Purpose: Express REST API backend with Dokku command execution
- Contains: Route handlers, business logic, SSH execution, database, WebSocket
- Key files: `index.ts`, `lib/executor.ts`, `lib/dokku.ts`, `lib/apps.ts`

**data/:**
- Purpose: SQLite database storage location
- Contains: `docklight.db` (created at runtime if missing)
- Key files: `docklight.db`

**.github/:**
- Purpose: GitHub Actions CI/CD workflows
- Contains: Workflow definitions for testing and deployment
- Key files: `workflows/`

**.planning/:**
- Purpose: Project planning and architecture documentation
- Contains: Codebase analysis documents like this one
- Key files: `codebase/ARCHITECTURE.md`, `codebase/STRUCTURE.md`

**docs/:**
- Purpose: Additional project documentation
- Contains: Supplementary docs not in root README
- Key files: (varies)

**scripts/:**
- Purpose: Build scripts and utilities
- Contains: Automation scripts for development/deployment
- Key files: `ralph/` (archive)

**tasks/:**
- Purpose: Task definitions and management
- Contains: Project task tracking files
- Key files: (varies)

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server entry point with all route definitions
- `client/src/main.tsx`: React app mounting point
- `client/src/App.tsx`: Root component with routing configuration

**Configuration:**
- `server/package.json`: Server dependencies and scripts
- `client/package.json`: Client dependencies and scripts
- `justfile`: Quick commands for development (install, dev, test, lint, etc.)
- `tsconfig.json`: TypeScript configuration (root, server, client)
- `biome.json`: Code formatting and linting rules

**Core Logic:**
- `server/lib/executor.ts`: SSH command execution with pooling
- `server/lib/dokku.ts`: Dokku CLI command builders
- `server/lib/apps.ts`: App management business logic
- `server/lib/databases.ts`: Database management business logic
- `server/lib/plugins.ts`: Plugin management business logic
- `server/lib/auth.ts`: Authentication and RBAC logic
- `server/lib/db.ts`: SQLite database operations
- `server/lib/cache.ts`: In-memory caching layer
- `server/lib/websocket.ts`: Log streaming via WebSocket

**Testing:**
- `server/**/*.test.ts`: Vitest unit/integration tests
- `client/src/**/*.test.tsx`: Vitest + Testing Library component tests
- `client/src/test/`: Test utilities and setup

## Naming Conventions

**Files:**
- kebab-case for most files: `command-executor.ts`, `app-detail.tsx`
- PascalCase for React components: `AppLayout.tsx`, `CreateAppDialog.tsx`
- `*.test.ts` for test files matching source file name
- `*.test.tsx` for React component tests

**Directories:**
- kebab-case for directories: `client/src/pages/AppDetail/`
- `lib/` for shared utilities
- `components/` for reusable UI components
- `pages/` for route page components

**Functions/Variables:**
- camelCase for functions and variables: `getApps()`, `executeCommand()`
- PascalCase for classes and interfaces: `SSHPool`, `CommandResult`
- SCREAMING_SNAKE_CASE for constants: `API_BASE`, `PORT`

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/[feature-name].ts`
- Tests: `server/lib/[feature-name].test.ts`
- Client UI: `client/src/pages/[PageName].tsx`
- Client tests: `client/src/pages/[PageName].test.tsx`

**New Component/Module:**
- Implementation: `client/src/components/[ComponentName].tsx`
- Tests: `client/src/components/[ComponentName].test.tsx`

**Utilities:**
- Shared helpers: `server/lib/[utility-name].ts` (server), `client/src/lib/[utility-name].ts` (client)
- Test utilities: `client/src/test/test-utils.tsx`

**New API Route:**
- Route handler: Add to `server/index.ts`
- Business logic: Add to appropriate `server/lib/[feature].ts`
- Client API: Add to `client/src/lib/api.ts` (if complex) or inline fetch
- Schema validation: Add to `client/src/lib/schemas.ts`

## Special Directories

**client/dist/:**
- Purpose: Production build output from Vite
- Generated: Yes
- Committed: No (gitignored)

**server/dist/:**
- Purpose: Production build output from TypeScript compiler
- Generated: Yes
- Committed: No (gitignored)

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes
- Committed: No (gitignored)

**.git/:**
- Purpose: Git repository metadata
- Generated: Yes (by git init)
- Committed: N/A (repository itself)

**data/:**
- Purpose: Runtime database storage
- Generated: Partially (database file created at runtime)
- Committed: Directory yes, database file no (gitignored)

---

*Structure analysis: 2026-03-01*
