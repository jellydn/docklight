# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
docklight/
├── client/                 # React frontend
├── server/                 # Express backend
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── data/                   # Runtime data (SQLite DB, logs)
├── .planning/              # Planning documents
├── justfile                # Just command runner recipes
├── Dockerfile              # Container image
├── docker-compose.yml      # Local development stack
├── README.md               # Project documentation
└── AGENTS.md               # Claude agent guidelines
```

## Directory Purposes

**client/:**
- Purpose: React single-page application
- Contains: UI components, pages, API client, styling
- Key files: `src/main.tsx`, `src/App.tsx`, `src/pages/`, `src/components/`

**server/:**
- Purpose: Express API server and WebSocket server
- Contains: Routes, business logic, command executor, database
- Key files: `index.ts`, `lib/`, `lib/*.test.ts`

**docs/:**
- Purpose: Project documentation
- Contains: Deployment guide, contributing guidelines
- Key files: `deployment.md`

**scripts/:**
- Purpose: Automation and utility scripts
- Contains: Ralph agent configuration
- Key files: `ralph/`

**data/:**
- Purpose: Runtime data storage
- Contains: SQLite database file
- Generated: Yes
- Committed: No (in .gitignore)

## Key File Locations

**Entry Points:**
- `server/index.ts`: Express server entry point
- `client/src/main.tsx`: React app entry point

**Configuration:**
- `server/package.json`: Server dependencies and scripts
- `client/package.json`: Client dependencies and scripts
- `server/biome.json`: Shared linting/formatting rules
- `server/tsconfig.json`: Server TypeScript config
- `client/vite.config.ts`: Client Vite config (uses defaults)

**Core Logic:**
- `server/lib/apps.ts`: App management operations
- `server/lib/databases.ts`: Database operations
- `server/lib/plugins.ts`: Plugin management
- `server/lib/executor.ts`: SSH command execution
- `server/lib/auth.ts`: JWT authentication
- `server/lib/websocket.ts`: Log streaming

**Testing:**
- `server/index.test.ts`: Integration tests
- `server/lib/*.test.ts`: Unit tests per module

## Naming Conventions

**Files:**
- TypeScript: `.ts` extension
- React components: `.tsx` extension
- Test files: `.test.ts` suffix (co-located with source)
- Components: PascalCase (`AppLayout.tsx`, `CommandResult.tsx`)
- Utilities: camelCase (`api.ts`, `logger.ts`)
- Pages: PascalCase singular (`Dashboard.tsx`, `AppDetail.tsx`)

**Directories:**
- Lowercase (`components/`, `pages/`, `lib/`)

## Where to Add New Code

**New Feature (Backend):**
- Primary code: `server/lib/[feature].ts`
- Tests: `server/lib/[feature].test.ts`
- Routes: Add to `server/index.ts`

**New Feature (Frontend):**
- Page component: `client/src/pages/[Feature].tsx`
- Shared components: `client/src/components/[Component].tsx`
- API client: Add to `client/src/lib/api.ts`

**New Component/Module:**
- Implementation: `client/src/components/[Component].tsx`

**Utilities:**
- Shared helpers (client): `client/src/lib/[util].ts`
- Shared helpers (server): `server/lib/[util].ts`

## Special Directories

**client/src/ui/:**
- Purpose: Reusable UI components built on Radix UI
- Generated: No
- Committed: Yes
- Contains: button.tsx, card.tsx, etc. (Radix-based primitives)

**data/:**
- Purpose: SQLite database and runtime data
- Generated: Yes
- Committed: No (in .gitignore)

**.planning/:**
- Purpose: Planning documents, codebase maps
- Generated: No
- Committed: Optional (for team reference)

---

*Structure analysis: 2026-02-28*
