# Codebase Structure

**Analysis Date:** 2026-03-07

## Directory Layout

```
docklight/
├── client/ # React frontend application
│   ├── src/ # Client source code
│   │   ├── components/ # Reusable React components
│   │   ├── contexts/ # React contexts
│   │   ├── hooks/ # Custom React hooks
│   │   ├── lib/ # Utility libraries (API client, schemas)
│   │   ├── pages/ # Page components
│   │   └── test/ # Test setup and utilities
│   ├── public/ # Static assets
│   ├── dist/ # Built frontend (generated)
│   ├── biome.json # Biome config for client
│   ├── vite.config.ts # Vite build config
│   ├── vitest.config.ts # Vitest test config
│   ├── playwright.config.ts # Playwright E2E config
│   └── package.json # Client dependencies
├── server/ # Express backend application
│   ├── lib/ # Business logic and utilities
│   │   └── test-data/ # Test database files (generated)
│   ├── routes/ # Express route handlers
│   ├── dist/ # Compiled TypeScript (generated)
│   ├── data/ # Runtime data directory (SQLite databases)
│   ├── biome.json # Biome config for server
│   ├── vitest.config.ts # Vitest test config
│   ├── index.ts # Server entry point
│   └── package.json # Server dependencies
├── docs/ # Documentation
├── .github/ # GitHub Actions workflows
├── .planning/ # Planning documents
├── scripts/ # Build and deployment scripts
├── tasks/ # Task management
├── justfile # Task runner commands
├── Dockerfile # Container image definition
├── Procfile # Dokku process configuration
└── README.md # Project documentation
```

## Directory Purposes

**client/:**
- Purpose: React SPA frontend
- Contains: UI components, pages, hooks, API client
- Key files: `src/main.tsx` (entry), `src/App.tsx` (root component)

**client/src/components/:**
- Purpose: Reusable React components
- Contains: Dialogs, layouts, filters, and UI components
- Key files: `AppLayout.tsx`, `CreateAppDialog.tsx`

**client/src/pages/:**
- Purpose: Page-level components (routes)
- Contains: One component per app page
- Key files: `Dashboard.tsx`, `Apps.tsx`, `AppDetail.tsx`

**client/src/hooks/:**
- Purpose: Custom React hooks
- Contains: API integration and state management hooks
- Key files: `use-audit-log.ts`, `use-streaming-action.ts`

**client/src/lib/:**
- Purpose: Client utility libraries
- Contains: API client, schemas, utility functions
- Key files: `api.ts`, `schemas.ts`

**server/:**
- Purpose: Express backend server
- Contains: API routes, business logic, database access
- Key files: `index.ts` (entry point)

**server/lib/:**
- Purpose: Business logic and utilities
- Contains: Dokku integration, command execution, database operations
- Key files: `executor.ts`, `dokku.ts`, `db.ts`, `apps.ts`

**server/routes/:**
- Purpose: Express route handlers
- Contains: API endpoints grouped by resource
- Key files: `apps.ts`, `auth.ts`, `commands.ts`

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server startup, route registration, WebSocket setup
- `client/src/main.tsx`: React app mount

**Configuration:**
- `server/vitest.config.ts`: Server test configuration
- `client/vitest.config.ts`: Client test configuration
- `client/vite.config.ts`: Vite build configuration
- `client/biome.json`, `server/biome.json`: Code style configuration
- `justfile`: Project task commands

**Core Logic:**
- `server/lib/executor.ts`: SSH command execution engine
- `server/lib/dokku.ts`: Dokku CLI command builder
- `server/lib/db.ts`: SQLite database operations
- `server/lib/auth.ts`: JWT authentication middleware
- `server/lib/websocket.ts`: WebSocket log streaming
- `server/lib/sse.ts`: SSE stream writer

**Testing:**
- `server/lib/*.test.ts`: Unit tests for business logic
- `server/routes/*.test.ts`: Integration tests for API endpoints
- `client/src/**/*.test.tsx`: Component tests

## Naming Conventions

**Files:**
- kebab-case: `app-buildpacks.ts`, `create-app-dialog.tsx`
- Test files: `*.test.ts`, `*.test.tsx` (co-located with source)

**Directories:**
- kebab-case: `src/components/`, `server/lib/`

**Functions:**
- camelCase: `getApps()`, `executeCommand()`, `isValidAppName()`

**Types/Interfaces:**
- PascalCase: `interface App`, `type CommandResult`, `interface SSEWriter`

**Constants:**
- SCREAMING_SNAKE_CASE: `DEFAULT_SSH_PORT`, `JWT_SECRET` (env vars), but many constants use camelCase like `UNKNOWN_ERROR`

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/[feature].ts` (business logic), `server/routes/[feature].ts` (API)
- Tests: `server/lib/[feature].test.ts`, `server/routes/[feature].test.ts`
- Client: `client/src/pages/[Feature].tsx`, `client/src/components/[Feature]*.tsx`

**New Component/Module:**
- Implementation: `client/src/components/[component-name].tsx` or `server/lib/[module-name].ts`

**Utilities:**
- Shared helpers: `server/lib/[utility].ts` or `client/src/lib/[utility].ts`

**New API Route:**
- Implementation: `server/routes/[resource].ts`
- Registration: Add to `server/routes/index.ts`

## Special Directories

**server/lib/test-data/:**
- Purpose: Test-generated SQLite database files
- Generated: Yes
- Committed: No (in .gitignore)

**server/dist/, client/dist/:**
- Purpose: Compiled JavaScript output
- Generated: Yes
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (in .gitignore)

**data/:**
- Purpose: Runtime SQLite databases
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-07*
