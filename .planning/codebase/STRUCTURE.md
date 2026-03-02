# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
./
├── server/          # Express backend with TypeScript
├── client/          # React + Vite frontend
├── docs/            # Project documentation
├── tasks/           # Task tracking (PRDs, issues)
└── .planning/       # Planning artifacts
```

## Directory Purposes

**server/:**
- Purpose: Express backend API server
- Contains: TypeScript source files, routes, lib modules, tests
- Key files:
  - `server/index.ts` - Entry point
  - `server/lib/executor.ts` - Command execution
  - `server/lib/db.ts` - Database
  - `server/lib/auth.ts` - Authentication
  - `server/lib/dokku.ts` - CLI wrapper

**client/:**
- Purpose: React SPA frontend
- Contains: TypeScript/TSX source, components, pages, utilities
- Key files:
  - `client/src/main.tsx` - Entry point
  - `client/src/App.tsx` - Router setup
  - `client/src/lib/api.ts` - API client
  - `client/src/contexts/auth-context.tsx` - Auth state

**docs/:**
- Purpose: Project documentation
- Contains: Deployment guides, API docs

**tasks/:**
- Purpose: Task tracking and requirements
- Contains: PRD documents, feature specs

**.planning/:**
- Purpose: Planning artifacts
- Contains: Architecture analysis, structure diagrams

## Key File Locations

**Entry Points:**
- `server/index.ts` - Server bootstrap
- `client/src/main.tsx` - Client bootstrap

**Configuration:**
- `server/package.json` - Backend deps
- `client/package.json` - Frontend deps
- `server/tsconfig.json` - Backend TypeScript config
- `client/tsconfig.json` - Frontend TypeScript config
- `justfile` - Task runner commands

**Core Logic:**
- `server/lib/executor.ts` - Command execution (418 lines)
- `server/lib/dokku.ts` - CLI command builder (244 lines)
- `server/lib/apps.ts` - App management (991 lines)
- `server/lib/auth.ts` - Authentication (151 lines)
- `server/lib/db.ts` - Database operations

**API Routes:**
- `server/routes/index.ts` - Route registration
- `server/routes/apps.ts` - App management routes
- `server/routes/auth.ts` - Authentication routes
- `server/routes/util.ts` - Route utilities

**Testing:**
- `server/index.test.ts` - Server integration tests
- `server/lib/*.test.ts` - Unit tests for lib modules
- `client/src/**/*.test.tsx` - React component tests

## Naming Conventions

**Files:**
- `*.test.ts` - Server unit tests
- `*.test.tsx` - Client component tests
- `*.ts` - Source files
- `*.tsx` - React components
- kebab-case for all files: `command-executor.ts`, `user-auth.tsx`

**Directories:**
- `pages/` - Page components
- `components/` - Reusable UI components
- `components/ui/` - Radix UI primitives (tailwind)
- `lib/` - Shared utilities and helpers
- `routes/` - API route handlers
- `contexts/` - React contexts
- `pages/AppDetail/` - Sub-pages with kebab-case names

## Where to Add New Code

**New API Endpoint:**
- Primary code: `server/routes/`
- Service logic: `server/lib/`
- Register route: Update `server/routes/index.ts`
- Write tests: Create `*.test.ts` in `server/lib/`

**New Frontend Page:**
- Create file in `client/src/pages/`
- Add routes in `client/src/App.tsx`
- Create test: PageName.test.tsx in same directory

**New Shared Component:**
- Create in `client/src/components/`
- For UI primitives: `client/src/components/ui/`
- Create test: ComponentName.test.tsx

**New Utility Function:**
- Create in `server/lib/` or `client/src/lib/`
- Export via barrel file: `*.ts` files with `export * from "./module.js"`

## Special Directories

**server/lib/:**
- Purpose: Core business logic and utilities
- Generated: No
- Committed: Yes
- Contains: 24+ TypeScript modules (auth, db, apps, executor, websocket, etc.)

**server/routes/:**
- Purpose: HTTP API endpoints organized by domain
- Generated: No
- Committed: Yes
- Contains: 19 route files organized by resource type

**client/src/pages/:**
- Purpose: Page components for different views
- Generated: No
- Committed: Yes
- Contains: 8+ page components (Apps, AppDetail, Dashboard, Databases, etc.)

**client/src/components/:**
- Purpose: Reusable UI components
- Generated: No
- Committed: Yes
- Contains: 4+ components (AppLayout, ToastProvider, etc.)

**server/dist/:**
- Purpose: Compiled TypeScript for production
- Generated: Yes (after `bun run build`)
- Committed: No (gitignore)

**client/dist/:**
- Purpose: Built production assets
- Generated: Yes (after `bun run build`)
- Committed: No (gitignore)

**client/src/test/:**
- Purpose: Client test setup
- Generated: No
- Committed: Yes
- Contains: Test configuration

**server/test-data/:**
- Purpose: Test data fixtures
- Generated: No
- Committed: Yes
- Contains: Sample responses for testing

---

*Structure analysis: 2026-03-02*
