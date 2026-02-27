# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout
```
docklight/
├── client/                    # React SPA frontend (Vite + Tailwind)
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── assets/            # Frontend assets
│   │   ├── components/        # Shared UI components
│   │   ├── lib/               # API client utilities
│   │   ├── pages/             # Route-level page components
│   │   ├── App.tsx            # Router + layout definition
│   │   ├── App.css            # App-level styles
│   │   ├── index.css          # Global styles (Tailwind directives)
│   │   └── main.tsx           # React entry point
│   ├── biome.json             # Biome linter/formatter config
│   ├── index.html             # HTML shell for SPA
│   ├── package.json           # Client dependencies
│   ├── postcss.config.js      # PostCSS config (Tailwind)
│   ├── tailwind.config.js     # Tailwind CSS config
│   ├── tsconfig.json          # TypeScript project references
│   ├── tsconfig.app.json      # App TypeScript config
│   ├── tsconfig.node.json     # Node TypeScript config (Vite)
│   └── vite.config.ts         # Vite bundler config
├── server/                    # Express backend
│   ├── lib/
│   │   ├── allowlist.ts       # Allowed shell commands whitelist
│   │   ├── apps.ts            # App CRUD + status operations
│   │   ├── auth.ts            # JWT auth, login, middleware
│   │   ├── config.ts          # App env var management
│   │   ├── databases.ts       # Database plugin operations
│   │   ├── db.ts              # SQLite command history storage
│   │   ├── domains.ts         # Domain management
│   │   ├── executor.ts        # Shell command execution + logging
│   │   ├── server.ts          # Server health (CPU/mem/disk)
│   │   ├── ssl.ts             # SSL/Let's Encrypt management
│   │   └── websocket.ts       # WebSocket log streaming
│   ├── biome.json             # Biome linter/formatter config
│   ├── index.ts               # Express app entry point + routes
│   ├── package.json           # Server dependencies
│   └── tsconfig.json          # Server TypeScript config
├── scripts/                   # Automation scripts
│   └── ralph/                 # Ralph agent scripts
├── .agents/                   # Agent tooling
│   └── skills/
│       └── dev-browser/       # Browser automation skill
├── .planning/                 # Project planning documents
│   └── codebase/              # Architecture analysis docs
├── .claude/                   # Claude AI configuration
├── AGENTS.md                  # AI agent development guide
├── CLAUDE.md                  # Claude project instructions
├── Dockerfile                 # Multi-stage Docker build
├── Procfile                   # Dokku process definition
├── app.json                   # Dokku app metadata + healthcheck
├── justfile                   # Task runner recipes
├── LICENSE                    # Project license
└── README.md                  # Project documentation
```

## Directory Purposes
**client/src/pages/:**
- Purpose: Route-level page components, one per app route
- Contains: `Dashboard.tsx`, `Apps.tsx`, `AppDetail.tsx`, `Databases.tsx`, `Login.tsx`
- Key files: `AppDetail.tsx` (largest, multi-tab view with logs/config/domains/ssl)

**client/src/components/:**
- Purpose: Shared UI components used across pages
- Contains: Layout shell, toast notification system, command result display, shared types
- Key files: `AppLayout.tsx` (sidebar + outlet), `ToastProvider.tsx` (context), `types.ts` (shared interfaces)

**client/src/lib/:**
- Purpose: Client-side utilities and API layer
- Contains: HTTP client wrapper
- Key files: `api.ts` (apiFetch with auth handling)

**server/lib/:**
- Purpose: All backend business logic, one file per resource domain
- Contains: Domain modules, infrastructure (auth, db, executor, websocket)
- Key files: `executor.ts` (central shell runner), `auth.ts` (JWT + middleware), `db.ts` (SQLite)

## Key File Locations
**Entry Points:**
- `server/index.ts`: Express server bootstrap, all route definitions, WebSocket setup
- `client/src/main.tsx`: React DOM mount point
- `client/src/App.tsx`: React Router configuration + provider wiring
- `Dockerfile`: Production container build

**Configuration:**
- `server/package.json`: Server deps (express, better-sqlite3, jsonwebtoken, ws)
- `client/package.json`: Client deps (react 19, react-router-dom 7, tailwindcss 3)
- `justfile`: All dev/build/lint/format commands
- `app.json`: Dokku app metadata
- `Procfile`: Production process command

**Core Logic:**
- `server/lib/executor.ts`: Central shell command executor (exec → log → return)
- `server/lib/apps.ts`: App listing, detail, restart, rebuild, scale
- `server/lib/databases.ts`: Multi-plugin database CRUD + linking
- `server/lib/auth.ts`: Password auth, JWT generation/verification, cookie management
- `server/lib/websocket.ts`: Real-time log streaming via `dokku logs -t`
- `client/src/lib/api.ts`: Typed fetch wrapper with 401 auto-redirect

**Testing:**
- `.agents/skills/dev-browser/`: Browser automation tests (Vitest)
- No unit tests in `server/` or `client/` currently

## Naming Conventions
**Files:**
- kebab-case for all source files: `command-executor.ts`, `AppLayout.tsx`
- Exception: React components use PascalCase filenames: `AppDetail.tsx`, `Dashboard.tsx`
- Types co-located in `types.ts` files within component directories

**Directories:**
- Lowercase, singular nouns: `lib/`, `pages/`, `components/`, `assets/`
- Top-level: `server/`, `client/`, `scripts/`

**Code:**
- Functions: camelCase with verb prefixes (`getApps`, `executeCommand`, `isValidAppName`)
- Interfaces/Types: PascalCase (`CommandResult`, `AppDetail`, `SSLStatus`)
- Constants: SCREAMING_SNAKE_CASE (`ALLOWED_COMMANDS`, `SUPPORTED_PLUGINS`, `JWT_SECRET`)
- Route paths: RESTful (`/api/apps/:name/config`, `/api/databases/:name/link`)

## Where to Add New Code
**New Dokku Resource (e.g., network management):**
- Domain logic: `server/lib/networks.ts`
- Routes: Add to `server/index.ts`
- Client page: `client/src/pages/Networks.tsx`
- Route entry: Add to `client/src/App.tsx` Routes
- Nav link: Add to `client/src/components/AppLayout.tsx`

**New API Endpoint:**
- Implementation: `server/lib/<resource>.ts`
- Route registration: `server/index.ts`

**New UI Component:**
- Implementation: `client/src/components/<ComponentName>.tsx`
- Shared types: `client/src/components/types.ts`

**Utilities:**
- Server: `server/lib/` (follow existing module pattern)
- Client: `client/src/lib/`

## Special Directories
**data/:**
- Purpose: SQLite database storage (`docklight.db`)
- Generated: Yes (created at runtime by `server/lib/db.ts`)
- Committed: No (created outside project root at `../data/`)

**.agents/:**
- Purpose: AI agent skills and tooling
- Generated: No
- Committed: Yes

**.planning/:**
- Purpose: Architecture analysis and planning documents
- Generated: Yes (by analysis tools)
- Committed: Yes

**client/dist/ and server/dist/:**
- Purpose: Production build output
- Generated: Yes (by `vite build` and `tsc`)
- Committed: No (gitignored)

---
*Structure analysis: 2026-02-27*
