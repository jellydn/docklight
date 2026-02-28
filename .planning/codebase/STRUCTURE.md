# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
docklight/
├── server/ # Express backend (TypeScript, port 3001)
│   ├── lib/ # Business logic modules
│   ├── data/ # SQLite database file
│   ├── dist/ # Compiled JavaScript output
│   └── index.ts # Server entry point
├── client/ # React + Vite frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/ # Route page components
│   │   ├── lib/ # Utilities, API client, logger
│   │   └── main.tsx # Client entry point
│   ├── public/ # Static assets
│   └── dist/ # Built production bundle
├── .agents/skills/dev-browser/ # Browser automation testing
├── .github/workflows/ # CI/CD pipelines
├── .planning/codebase/ # This documentation
├── scripts/ # Utility scripts
└── docs/ # Project documentation
```

## Directory Purposes

**server/:**
- Purpose: Express API backend for Dokku management
- Contains: API routes, business logic, command execution, auth
- Key files: `index.ts` (entry), `lib/apps.ts`, `lib/databases.ts`, `lib/executor.ts`

**client/:**
- Purpose: React SPA user interface
- Contains: React components, pages, API client, styling
- Key files: `src/main.tsx`, `src/App.tsx`, `src/lib/api.ts`

**.agents/skills/dev-browser/:**
- Purpose: Browser automation testing infrastructure
- Contains: Snapshot testing, browser extension relay
- Generated: No (source code)
- Committed: Yes

**.github/workflows/:**
- Purpose: CI/CD pipeline definitions
- Contains: `ci.yml`, `deploy-staging.yml`
- Generated: No

**.planning/codebase/:**
- Purpose: Codebase documentation and planning
- Contains: This set of markdown files
- Generated: Yes (by codemap skill)

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server setup with all routes
- `client/src/main.tsx`: React application bootstrap

**Configuration:**
- `server/tsconfig.json`: Server TypeScript configuration
- `client/tsconfig.json`: Client TypeScript configuration with @ alias
- `server/biome.json`: Shared Biome linting/formatting config
- `client/vite.config.ts`: Vite dev server config with API proxy
- `server/vitest.config.ts`: Server test configuration
- `client/vitest.config.ts`: Client test configuration (implied)

**Core Logic:**
- `server/lib/executor.ts`: Shell command execution with timeout
- `server/lib/apps.ts`: Dokku app management operations
- `server/lib/databases.ts`: Database service management
- `server/lib/plugins.ts`: Dokku plugin management
- `server/lib/auth.ts`: Authentication and session handling
- `server/lib/cache.ts`: In-memory caching layer
- `server/lib/allowlist.ts`: Command allowlist for security

**Testing:**
- `server/lib/*.test.ts`: Co-located server tests
- `client/src/components/*.test.tsx`: Co-located component tests
- `client/src/test/setup.ts`: Test configuration and mocks

## Naming Conventions

**Files:**
- kebab-case: `command-executor.ts`, `api-client.ts`
- Test files: `.test.ts` suffix (server), `.test.tsx` suffix (client)

**Directories:**
- lowercase: `lib/`, `pages/`, `components/`

**Functions:**
- camelCase: `getApps`, `restartApp`, `isValidAppName`

**Types/Interfaces:**
- PascalCase: `CommandResult`, `App`, `AppDetail`

**Constants:**
- SCREAMING_SNAKE_CASE: `ALLOWED_COMMANDS`

## Where to Add New Code

**New Feature (Backend):**
- Primary code: `server/lib/[feature].ts`
- Tests: `server/lib/[feature].test.ts`
- Routes: Add to `server/index.ts`

**New Feature (Frontend):**
- Primary code: `client/src/pages/[Feature].tsx`
- Components: `client/src/components/[Feature].tsx`
- Tests: Co-located `.test.tsx` files

**New Component/Module:**
- Implementation: `client/src/components/[ComponentName].tsx`
- UI primitives: `client/src/components/ui/[primitive].tsx`

**Utilities:**
- Shared helpers: `server/lib/utils.ts` or `client/src/lib/utils.ts`

## Special Directories

**dist/ (server and client):**
- Purpose: Compiled/built output
- Generated: Yes
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: JavaScript dependencies
- Generated: Yes
- Committed: No

**data/ (server):**
- Purpose: SQLite database files
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-02-28*
