# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview
**Overall:** Client-Server Monolith with Shell Command Proxy
**Key Characteristics:**
- React SPA frontend communicates with Express backend via REST API + WebSocket
- Backend acts as an authenticated proxy to the Dokku CLI on the host machine
- All Dokku operations are executed as shell commands via `child_process.exec`
- Single SQLite database stores command history for audit logging
- JWT-based session authentication via httpOnly cookies

## Layers
**Presentation Layer (Client):**
- Purpose: Renders the UI and handles user interactions
- Location: `client/src/`
- Contains: React components, pages, API client, CSS/Tailwind styles
- Depends on: Server REST API (`/api/*`), WebSocket (`/api/apps/:name/logs/stream`)
- Used by: End users via browser

**API Layer (Server Routes):**
- Purpose: Defines HTTP endpoints and request/response handling
- Location: `server/index.ts`
- Contains: Express route definitions, middleware wiring, SPA static file serving
- Depends on: Domain modules (`server/lib/*.ts`), auth middleware
- Used by: Client SPA

**Domain Layer (Server Lib):**
- Purpose: Business logic for each Dokku resource type
- Location: `server/lib/`
- Contains: Resource modules (apps, databases, domains, config, ssl, server health)
- Depends on: Executor (`executor.ts`), validators (`apps.ts#isValidAppName`)
- Used by: API routes in `server/index.ts`

**Infrastructure Layer:**
- Purpose: Shell execution, persistence, authentication, real-time streaming
- Location: `server/lib/executor.ts`, `server/lib/db.ts`, `server/lib/auth.ts`, `server/lib/websocket.ts`
- Contains: Command executor with logging, SQLite storage, JWT auth, WebSocket log streaming
- Depends on: `child_process`, `better-sqlite3`, `jsonwebtoken`, `ws`
- Used by: Domain layer modules

## Data Flow
**REST API Request (e.g., restart app):**
1. Client calls `apiFetch("/apps/myapp/restart", { method: "POST" })` with credentials
2. Express receives request → `authMiddleware` verifies JWT from `session` cookie
3. Route handler calls domain function `restartApp("myapp")`
4. Domain function validates input → calls `executeCommand("dokku ps:restart myapp")`
5. Executor runs shell command via `child_process.exec` → saves result to SQLite via `saveCommand`
6. `CommandResult` (command, exitCode, stdout, stderr) returned through the chain to client
7. Client shows toast notification with command output

**WebSocket Log Streaming:**
1. Client opens WebSocket to `/api/apps/:name/logs/stream`
2. Server validates JWT from cookie on HTTP upgrade
3. Server spawns `dokku logs <app> -t -n <lines>` child process
4. stdout/stderr piped as JSON messages (`{ line }`) to WebSocket client
5. Connection closes when process exits or client disconnects

**Authentication Flow:**
1. User submits password → `POST /api/auth/login`
2. Server compares against `DOCKLIGHT_PASSWORD` env var
3. On success, generates JWT (24h expiry) → sets `session` httpOnly cookie
4. All `/api/*` routes (except login/health) protected by `authMiddleware`
5. Client `apiFetch` auto-redirects to `/login` on 401

**State Management:**
- Server: Stateless except SQLite command history; no in-memory caches
- Client: Local component state via `useState`/`useEffect`; no global store
- Dashboard polls server every 30 seconds for health/apps/commands refresh

## Key Abstractions
**CommandResult:**
- Purpose: Unified return type for all shell command executions
- Examples: `server/lib/executor.ts`, `client/src/components/types.ts`
- Pattern: `{ command, exitCode, stdout, stderr }` — every Dokku operation returns this

**Resource Modules:**
- Purpose: One module per Dokku resource type, each wrapping CLI commands
- Examples: `server/lib/apps.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/config.ts`, `server/lib/ssl.ts`
- Pattern: Export async functions that validate input → call `executeCommand()` → parse CLI output

**apiFetch:**
- Purpose: Typed HTTP client with auto-auth handling
- Examples: `client/src/lib/api.ts`
- Pattern: Wraps `fetch` with JSON headers, credentials, 401 redirect, error extraction

**Toast System:**
- Purpose: Shows command results as dismissable notifications
- Examples: `client/src/components/ToastProvider.tsx`, `client/src/components/ToastContainer.tsx`
- Pattern: React Context provider + consumer; toasts include expandable `CommandResult` detail

## Entry Points
**Server:**
- Location: `server/index.ts`
- Triggers: `bun run dev` (tsx watch) or `node server/dist/index.js` (production)
- Responsibilities: Initializes Express app, registers routes, serves client SPA, starts HTTP + WebSocket server on `PORT` (default 3001)

**Client:**
- Location: `client/src/main.tsx` → `client/src/App.tsx`
- Triggers: Browser navigation to the app URL
- Responsibilities: Mounts React app with router, defines page routes (Login, Dashboard, Apps, AppDetail, Databases)

**Docker:**
- Location: `Dockerfile`
- Triggers: `docker build` / Dokku deployment
- Responsibilities: Multi-stage build (client → server → runtime), runs `node server/dist/index.js`

## Error Handling
**Strategy:** Return error objects rather than throwing; show full command output to user
**Patterns:**
- Domain functions return union types: `SuccessType | { error, command, exitCode, stderr }`
- Executor catches `exec` failures and returns `CommandResult` with non-zero exitCode
- Client `apiFetch` throws on non-OK responses; pages catch and display in error UI or toasts
- Input validation rejects early with exitCode 400 before shell execution
- Shell injection prevented via input sanitization (regex filters) and command allowlist

## Cross-Cutting Concerns
**Logging:** Console-based (`console.log`, `console.error`); all executed commands persisted to SQLite `command_history` table
**Validation:** App names validated via `isValidAppName` regex (`/^[a-z0-9-]+$/`); config keys/values and domains sanitized against shell metacharacters
**Authentication:** JWT tokens (24h expiry) stored in httpOnly secure cookies; single shared password from `DOCKLIGHT_PASSWORD` env var; WebSocket connections authenticated via cookie parsing on upgrade
**Security:** Command allowlist (`dokku`, `top`, `free`, `df`); input sanitization before shell execution; no direct shell access exposed to clients

---
*Architecture analysis: 2026-02-27*
