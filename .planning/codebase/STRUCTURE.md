# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
[project-root]/
├── server/           # Backend: Express + TypeScript
│   ├── lib/          # Core business logic
│   ├── routes/       # API route handlers
│   ├── data/         # SQLite database files
│   └── index.ts      # Server entry point
├── client/           # Frontend: React + Vite
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── contexts/    # React contexts (auth)
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Client utilities
│       ├── pages/       # Page components
│       └── main.tsx     # Client entry point
├── docs/             # Documentation
├── .github/          # GitHub workflows
├── justfile          # Task runner commands
└── biome.json        # Shared linting/formatting config
```

## Directory Purposes

**server/lib:**
- Purpose: Core business logic, Dokku interactions, database access
- Contains: Apps, databases, auth, SSH execution, WebSocket, caching
- Key files: `apps.ts`, `databases.ts`, `executor.ts`, `auth.ts`, `db.ts`

**server/routes:**
- Purpose: HTTP API endpoint handlers
- Contains: Route registration, request/response handling
- Key files: `apps.ts`, `commands.ts`, `auth.ts`, `settings.ts`

**server/data:**
- Purpose: SQLite database storage
- Contains: `docklight.db` (created on first run)
- Generated: Yes (not committed to git)

**client/src/components:**
- Purpose: Reusable UI components
- Contains: `ui/` (Radix UI primitives), `AppLayout.tsx`, `CreateAppDialog.tsx`
- Key files: `AppLayout.tsx`, `RequireAdmin.tsx`, `CommandResult.tsx`

**client/src/pages:**
- Purpose: Page-level components (routes)
- Contains: `AppDetail/` (subdirectory for app tabs), `Apps.tsx`, `Dashboard.tsx`
- Key files: `Login.tsx`, `Dashboard.tsx`, `Apps.tsx`, `AppDetail/index.tsx`

**client/src/lib:**
- Purpose: Client-side utilities
- Contains: API client, schemas, query keys, logging
- Key files: `api.ts`, `schemas.ts`, `query-keys.ts`

**client/src/hooks:**
- Purpose: Custom React hooks
- Contains: `use-streaming-action.ts`, `use-audit-log.ts`

**client/src/contexts:**
- Purpose: React contexts for global state
- Contains: `auth-context.tsx`

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server setup, route registration
- `client/src/main.tsx`: React app mounting

**Configuration:**
- `server/.env.example`: Environment variable template
- `server/biome.json`: Biome config (linting/formatting)
- `client/biome.json`: Biome config (linting/formatting)
- `justfile`: Task runner commands

**Core Logic:**
- `server/lib/executor.ts`: SSH and local shell command execution
- `server/lib/apps.ts`: App management (list, restart, rebuild, scale)
- `server/lib/databases.ts`: Database plugin management
- `server/lib/auth.ts`: JWT authentication and password hashing
- `server/lib/db.ts`: SQLite database operations
- `server/lib/dokku.ts`: Dokku command builder

**Testing:**
- `server/index.test.ts`: Server entry point tests
- `client/src/pages/*.test.tsx`: Component tests
- `client/src/pages/AppDetail/*.test.tsx`: App detail tab tests

## Naming Conventions

**Files:**
- kebab-case for files: `app-buildpacks.ts`, `create-user.ts`
- Test files: `<filename>.test.ts` or `<filename>.test.tsx`
- Route files: `app-*.ts` prefix for app-specific routes

**Directories:**
- kebab-case: `app-buildpacks`, `docker-options`

**Functions:**
- camelCase: `getApps()`, `restartApp()`, `isValidAppName()`
- Route handlers: `register*Routes()`: `registerAppRoutes()`

**Types:**
- PascalCase for interfaces/types: `App`, `AppDetail`, `CommandResult`
- Descriptive names: `UserRole`, `JWTPayload`, `ChecksReport`

**Constants:**
- SCREAMING_SNAKE_CASE: `ALLOWED_COMMANDS`, `JWT_SECRET`, `MAX_RETRIES`

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/<feature>.ts`
- Routes: `server/routes/<feature>.ts` (if API needed)
- Tests: `server/lib/<feature>.test.ts`

**New Component/Module:**
- Implementation: `client/src/components/<ComponentName>.tsx`
- Tests: `client/src/components/<ComponentName>.test.tsx`

**New App Detail Tab:**
- Implementation: `client/src/pages/AppDetail/App<Feature>.tsx`
- Tests: `client/src/pages/AppDetail/App<Feature>.test.tsx`

**Utilities:**
- Shared helpers: `client/src/lib/utils.ts` (frontend)
- Shared helpers: `server/lib/util.ts` (backend)

## Special Directories

**server/data:**
- Purpose: SQLite database files
- Generated: Yes
- Committed: No (in .gitignore)

**server/test-data:**
- Purpose: Test fixtures and mock data
- Generated: No
- Committed: Yes

**client/dist:**
- Purpose: Built client assets
- Generated: Yes
- Committed: No (in .gitignore)

**server/dist:**
- Purpose: Compiled server JavaScript
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-11*
