# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
[project-root]/
├── client/ # React SPA (Vite + TypeScript)
├── server/ # Express API and Dokku command orchestration
├── docs/ # Deployment and operational docs
├── scripts/ # Utility scripts (Ralph-related automation)
├── data/ # Runtime SQLite database directory (`docklight.db`)
├── .agents/ # Local skill assets (including dev-browser)
├── justfile # Cross-project command runner shortcuts
├── Dockerfile # Container build recipe
└── app.json # Dokku app/deploy metadata
```

## Directory Purposes

**client:**
- Purpose: Browser UI for login, dashboard, app management, database management, and live logs.
- Contains: React pages/components, API client, CSS assets, Vite/Tailwind/Biome config.
- Key files: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/pages/AppDetail.tsx`, `client/vite.config.ts`, `client/package.json`

**server:**
- Purpose: Backend API, auth, command execution, persistence, and WebSocket log streaming.
- Contains: Express entrypoint and feature-focused service modules in `server/lib/`.
- Key files: `server/index.ts`, `server/lib/executor.ts`, `server/lib/auth.ts`, `server/lib/websocket.ts`, `server/package.json`

**docs:**
- Purpose: Human documentation for deployment/setup.
- Contains: Markdown docs.
- Key files: `docs/deployment.md`

**scripts:**
- Purpose: Auxiliary automation not in app runtime.
- Contains: Ralph helper shell/prompt artifacts.
- Key files: `scripts/ralph/ralph.sh`, `scripts/ralph/prd.json`

**data:**
- Purpose: Persistent runtime state for command history.
- Contains: SQLite DB created at runtime.
- Key files: `data/docklight.db` (created by `server/lib/db.ts`)

## Key File Locations

**Entry Points:**
- `server/index.ts`: Backend process start, route registration, static serving, and WebSocket hookup.
- `client/src/main.tsx`: Frontend bootstrap and React root mount.

**Configuration:**
- `server/tsconfig.json`: Server TypeScript compiler config.
- `client/tsconfig.json`: Client TypeScript project config.
- `client/vite.config.ts`: Dev server and `/api` proxy configuration.
- `server/biome.json`: Server lint/format configuration.
- `client/biome.json`: Client lint/format configuration.
- `justfile`: Unified dev/test/build command shortcuts.
- `Dockerfile`: Containerization for deployment.

**Core Logic:**
- `server/lib/apps.ts`: App listing/detail/restart/rebuild/scale logic.
- `server/lib/config.ts`: Config var read/write/unset with sanitization.
- `server/lib/domains.ts`: Domain list/add/remove logic.
- `server/lib/databases.ts`: Database plugin operations.
- `server/lib/ssl.ts`: SSL status/enable/renew flows.
- `server/lib/executor.ts`: Command allowlist enforcement + command execution persistence.

**Testing:**
- `.agents/skills/dev-browser/src/**/*.test.ts`: Vitest-based tests for browser automation skill.

## Naming Conventions

**Files:**
- `kebab-case` for most repository-level docs/scripts/config names: `justfile`, `app.json`, `docs/deployment.md`.
- `PascalCase` for React page/component files in `client/src/pages/` and `client/src/components/`: `AppDetail.tsx`, `AppLayout.tsx`.
- `lowercase` module filenames for backend services in `server/lib/`: `apps.ts`, `executor.ts`, `websocket.ts`.

**Directories:**
- Feature/runtime split by top-level directories: `client/` and `server/`.
- Backend grouping by concern under `server/lib/` and frontend grouping by UI role under `client/src/pages/`, `client/src/components/`, and `client/src/lib/`.

## Where to Add New Code

**New Feature:**
- Primary code: `server/lib/` (backend capability) and matching UI page/component in `client/src/pages/` or `client/src/components/`.
- Tests: `.agents/skills/dev-browser/src/**/*.test.ts` for browser-skill coverage; repository app code currently has no dedicated app test directory.

**New Component/Module:**
- Implementation: `client/src/components/` for reusable UI blocks, `server/lib/` for backend service modules.

**Utilities:**
- Shared helpers: `client/src/lib/` for frontend helpers and `server/lib/` for backend shared utilities.

## Special Directories

**.agents/skills/dev-browser:**
- Purpose: Browser automation skill with its own package, scripts, and tests.
- Generated: No
- Committed: Yes

**.planning/codebase:**
- Purpose: Generated codebase mapping documents (including this file).
- Generated: Yes
- Committed: Not guaranteed (depends on team workflow and `.gitignore` policy)

**data:**
- Purpose: Runtime persistent SQLite storage used by `server/lib/db.ts`.
- Generated: Yes
- Committed: No (runtime state directory)

---

*Structure analysis: 2026-02-27*
