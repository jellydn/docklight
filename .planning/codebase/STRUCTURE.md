# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
docklight/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level components
│   │   ├── lib/              # Client utilities
│   │   └── assets/           # Static assets
│   ├── public/               # Static files
│   └── dist/                 # Build output
├── server/                    # Express + TypeScript backend
│   ├── lib/                   # Core libraries
│   └── dist/                  # Build output
├── data/                      # SQLite database (generated)
├── docs/                      # Documentation
├── .github/workflows/         # CI/CD workflows
├── scripts/                   # Build/utility scripts
└── justfile                   # Task runner commands
```

## Directory Purposes

**server/lib/:**
- Purpose: Core business logic and abstractions
- Contains: Command builders, SSH executor, database, caching, auth, all feature modules
- Key files:
  - `dokku.ts` (240 lines) - Dokku command builders
  - `executor.ts` (378 lines) - SSH connection pool and command execution
  - `db.ts` (147 lines) - SQLite audit logging
  - `cache.ts` (87 lines) - In-memory caching with TTL
  - `apps.ts` (373 lines) - App management logic
  - `auth.ts` (76 lines) - JWT authentication
  - `allowlist.ts` (11 lines) - Security command validation
  - `rate-limiter.ts` (66 lines) - Login rate limiting

**client/src/:**
- Purpose: React application source code
- Contains: Pages, components, API client, schemas, utilities
- Key files:
  - `App.tsx` (44 lines) - Main app with router configuration
  - `lib/api.ts` (89 lines) - API client with Zod validation
  - `lib/schemas.ts` (174 lines) - Zod type definitions
  - `pages/` - Route components (Dashboard, Apps, AppDetail, etc.)

**client/src/pages/:**
- Purpose: Page-level components for each route
- Contains: Dashboard, Apps list, App detail, Databases, Plugins, Audit, Login
- Key files:
  - `Dashboard.tsx` (212 lines)
  - `Apps.tsx` (127 lines)
  - `AppDetail.tsx` (2770 lines)
  - `Databases.tsx` (541 lines)
  - `Plugins.tsx` (249 lines)
  - `Audit.tsx` (338 lines)
  - `Login.tsx` (68 lines)
  - Test files for each page

**client/src/components/:**
- Purpose: Reusable UI components and page-level components
- Contains: AppLayout, CreateAppDialog, CommandResult, ToastProvider, UI primitives
- Key files:
  - `AppLayout.tsx` (110 lines) - Main layout with navigation
  - `ui/` - Radix UI primitives (button, dialog, input, card)
  - Test files for components

**client/src/lib/:**
- Purpose: Client-side utilities and helpers
- Contains: API client, schemas, command utilities, logging, plugin constants
- Key files:
  - `api.ts` (89 lines) - apiFetch with validation
  - `schemas.ts` (174 lines) - Zod type definitions
  - `command-utils.ts` (10 lines) - Command helpers
  - `logger.ts` (8 lines) - Logger wrapper
  - `utils.ts` (6 lines) - Utility functions

**data/:**
- Purpose: SQLite database storage
- Contains: `docklight.db` - Audit log history
- Generated: Yes (on first run)
- Committed: No

## Key File Locations

**Entry Points:**
- `server/index.ts`: Main server entry point, API routes, middleware setup
- `client/src/main.tsx`: React root render
- `client/src/App.tsx`: React Router configuration

**Configuration:**
- `server/package.json`: Backend dependencies and scripts
- `client/package.json`: Frontend dependencies and scripts
- `server/tsconfig.json`: TypeScript configuration
- `client/tsconfig.json`: TypeScript configuration
- `server/vitest.config.ts`: Testing configuration
- `client/vitest.config.ts`: Testing configuration
- `justfile`: Task runner commands

**Core Logic:**
- `server/lib/dokku.ts`: Dokku command builder interface
- `server/lib/executor.ts`: SSH connection pool and command execution
- `server/lib/apps.ts`: App management logic
- `server/lib/db.ts`: Audit logging
- `server/lib/cache.ts`: Caching layer
- `server/lib/auth.ts`: Authentication

**Testing:**
- `server/lib/*.test.ts`: Server unit tests
- `client/src/pages/*.test.tsx`: Client page tests
- `client/src/components/*.test.tsx`: Client component tests
- `client/src/test/setup.ts`: Test setup

**Deployment:**
- `Dockerfile`: Multi-stage Docker build
- `app.json`: Heroku/Cloud66 deployment config
- `Procfile`: Process definition
- `.github/workflows/ci.yml`: CI pipeline
- `.github/workflows/deploy-production.yml`: Production deployment workflow
- `.github/workflows/deploy-staging.yml`: Staging deployment workflow

## Naming Conventions

**Files:**
- Modules: kebab-case (e.g., `command-executor.ts`, `dokku.ts`)
- Test files: `*.test.ts` or `*.test.tsx`
- Configuration: lowercase, hyphens for JSON (e.g., `biome.json`, `vitest.config.ts`)
- Components: PascalCase for React components (e.g., `AppLayout.tsx`, `CreateAppDialog.tsx`)

**Directories:**
- Libraries: kebab-case (e.g., `lib/`, `src/components/`, `src/pages/`)
- Feature modules: kebab-case (e.g., `client/src/pages/`, `server/lib/`)
- Static assets: lowercase (e.g., `assets/`, `public/`)

**Types/Interfaces:**
- PascalCase for types (e.g., `CommandResult`, `App`, `JWTPayload`)
- CamelCase for functions and methods (e.g., `getApps()`, `login()`, `verifyToken()`)

**Constants:**
- SCREAMING_SNAKE_CASE (e.g., `ALLOWED_COMMANDS`, `DEFAULT_TTL`, `WINDOW_MS`)

## Where to Add New Code

**New Feature API Endpoint:**
- Primary code: `server/index.ts` - Add route handler with API pattern
- Lib module: `server/lib/feature-module.ts` - Implement business logic
- Examples: `server/lib/apps.ts`, `server/lib/domains.ts`, `server/lib/ports.ts`
- Validation: Add to `server/lib/schemas.ts` if adding new types
- Tests: `server/lib/feature-module.test.ts`

**New Frontend Page:**
- Implementation: `client/src/pages/NewPage.tsx`
- Routing: Add route in `client/src/App.tsx` under AppLayout
- Components: Create page-specific components in `client/src/components/`
- Tests: `client/src/pages/NewPage.test.tsx`

**New API Client Function:**
- Primary code: `client/src/lib/api.ts` - Add apiFetch call with schema
- Validation: Add Zod schema in `client/src/lib/schemas.ts`
- Usage: Import and call in page components

**New Utility/Helper:**
- Primary code: Create new file in `client/src/lib/` or `server/lib/`
- Tests: Create corresponding `*.test.ts` or `*.test.tsx`
- Documentation: Add JSDoc comments explaining usage

**New Dokku Command:**
- Primary code: Add method to `DokkuCommands` interface in `server/lib/dokku.ts`
- Implementation: Create lib module to use the new command
- Tests: Add tests in `server/lib/dokku.test.ts` and new module tests
- Validation: Add allowlist entry if command needs to be allowed

**New Database Schema:**
- Primary code: Add tables to `server/lib/db.ts` exec function
- Migration: If changing existing schema, handle migrations
- Tests: Add tests in `server/lib/db.test.ts`
- Types: Add TypeScript interfaces for new data structures

**New Component:**
- Implementation: Create new file in `client/src/components/` or `client/src/components/ui/`
- Variants: Use cva for component variants in `components/ui/*`
- Tests: Create corresponding `*.test.tsx` file

**New Library Module:**
- Location: `server/lib/` for backend, `client/src/lib/` for frontend
- Tests: `lib/*.test.ts` or `lib/*.test.tsx`
- Export: Add to `index.ts` if needed for import/export

**New CI/CD Workflow:**
- Location: `.github/workflows/`
- Examples: `ci.yml`, `deploy-production.yml`
- Follow existing patterns for GitHub Actions workflows

**New Documentation:**
- Location: `docs/` directory
- Examples: `deployment.md`, `architecture.md`
- Format: Markdown with clear headings and examples

## Special Directories

**data/:**
- Purpose: SQLite database for audit logs
- Generated: Yes (created on first run)
- Committed: No (ignored by .gitignore)
- Permissions: Read/write by server process

**client/dist/:**
- Purpose: Production build output
- Generated: Yes (via `bun run build`)
- Committed: No (ignored by .gitignore)
- Content: Optimized static assets and HTML

**server/dist/:**
- Purpose: Production build output
- Generated: Yes (via `bun run build`)
- Committed: No (ignored by .gitignore)
- Content: Transpiled TypeScript and dependencies

**client/public/:**
- Purpose: Static files served directly
- Content: `logo.svg`, favicon, other assets not bundled
- Committed: Yes

**server/node_modules/:**
- Purpose: Dependencies (backend)
- Generated: Yes (via `bun install`)
- Committed: No (ignored by .gitignore)

**client/node_modules/:**
- Purpose: Dependencies (frontend)
- Generated: Yes (via `bun install`)
- Committed: No (ignored by .gitignore)

---
*Structure analysis: 2026-02-28*
