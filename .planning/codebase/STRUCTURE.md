# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
docklight/
├── server/              # Backend Express application
│   ├── dist/           # Compiled TypeScript output (generated)
│   ├── lib/            # Core business logic modules
│   ├── routes/         # API route handlers
│   ├── index.ts        # Server entry point
│   └── package.json    # Server dependencies
├── client/             # Frontend React application
│   ├── dist/           # Built production files (generated)
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── contexts/   # React context providers
│   │   ├── lib/        # Client utilities
│   │   ├── pages/      # Page components
│   │   └── main.tsx    # Client entry point
│   └── package.json    # Client dependencies
├── .github/            # GitHub Actions workflows
├── justfile            # Development commands
├── Dockerfile          # Multi-stage container build
└── README.md           # Project documentation
```

## Directory Purposes

**server/:**
- Purpose: Express backend API server
- Contains: Route handlers, business logic, SSH execution, database
- Key files: `server/index.ts`, `server/lib/executor.ts`, `server/lib/db.ts`

**client/:**
- Purpose: React frontend single-page application
- Contains: React components, pages, API client, styling
- Key files: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/lib/api.ts`

**server/lib/:**
- Purpose: Core business logic and service modules
- Contains: Command execution, auth, database, WebSocket, Dokku operations
- Key files: `executor.ts`, `auth.ts`, `db.ts`, `websocket.ts`, `apps.ts`

**server/routes/:**
- Purpose: HTTP API endpoint handlers
- Contains: Route modules organized by domain (apps, auth, logs, etc.)
- Key files: `apps.ts`, `auth.ts`, `app-logs.ts`, `plugins.ts`

**client/src/pages/:**
- Purpose: Page-level React components
- Contains: Apps list, App detail, Dashboard, Login, Users, Plugins
- Key files: `Apps.tsx`, `AppDetail/index.tsx`, `Dashboard.tsx`, `Login.tsx`

**client/src/components/:**
- Purpose: Reusable UI components
- Contains: Layout components, dialogs, UI primitives
- Key files: `AppLayout.tsx`, `RequireAdmin.tsx`, `ui/` (Radix UI wrappers)

**client/src/lib/:**
- Purpose: Client utilities and helpers
- Contains: API client, validation schemas, utilities
- Key files: `api.ts`, `schemas.ts`, `utils.ts`, `command-utils.ts`

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server initialization and middleware setup
- `client/src/main.tsx`: React app mounting and initialization

**Configuration:**
- `server/tsconfig.json`: Server TypeScript configuration
- `client/tsconfig.json`: Client TypeScript configuration with `@/*` path alias
- `client/vite.config.ts`: Vite build configuration with proxy
- `biome.json`: Shared linting and formatting rules
- `.env.example`: Environment variable template

**Core Logic:**
- `server/lib/executor.ts`: Command execution via SSH with connection pooling
- `server/lib/auth.ts`: JWT authentication and session management
- `server/lib/db.ts`: SQLite database operations
- `server/lib/cache.ts`: In-memory caching with TTL
- `server/lib/websocket.ts`: Real-time log streaming
- `server/lib/apps.ts`: Application management operations

**Testing:**
- `server/**/*.test.ts`: Co-located unit/integration tests
- `client/src/**/*.test.tsx`: Co-located component tests
- `server/vitest.config.ts`: Vitest configuration for server
- `client/vitest.config.ts`: Vitest configuration for client

## Naming Conventions

**Files:**
- kebab-case: `command-executor.ts`, `app-layout.tsx`
- Test files: Same name with `.test.ts` suffix
- Page directories: PascalCase or kebab-case (`AppDetail/`, `Apps.tsx`)

**Functions:**
- camelCase: `getApps`, `executeCommand`, `validateUser`
- Async functions: Prefix with `async` keyword

**Variables:**
- camelCase: `jwtSecret`, `sshTarget`, `commandResult`
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TTL`)

**Types:**
- Interfaces: PascalCase (`CommandResult`, `User`, `App`)
- Type aliases: PascalCase (`CommandResultLike`, `JwtPayload`)

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/[feature].ts` (backend logic)
- Routes: `server/routes/[feature].ts` (API endpoints)
- Primary code: `client/src/pages/[Feature].tsx` (UI)
- Tests: `server/lib/[feature].test.ts`, `client/src/pages/[Feature].test.tsx`

**New Component/Module:**
- Implementation: `client/src/components/[Component].tsx`
- Export from: `client/src/components/index.ts` (if widely used)

**Utilities:**
- Shared helpers: `client/src/lib/[utility].ts` (client)
- Shared helpers: `server/lib/[utility].ts` (server)

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (gitignored)

**dist/ (both server and client):**
- Purpose: Compiled/built output
- Generated: Yes
- Committed: No (gitignored)

**.github/workflows/:**
- Purpose: CI/CD automation
- Generated: No
- Committed: Yes

**data/:
- Purpose: SQLite database storage
- Generated: Yes (database file created on first run)
- Committed: No (gitignored, contains .gitkeep)

---

*Structure analysis: 2026-03-02*
