# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Layered monolith (React SPA + Express API + service modules wrapping Dokku CLI)

**Key Characteristics:**
- Single backend entrypoint defines API surface and composes domain services in `server/index.ts`.
- Backend domain modules translate HTTP use cases into constrained shell execution via `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, and `server/lib/server.ts`.
- Frontend is a route-driven SPA (`client/src/App.tsx`) with page-level state and API calls through a shared fetch helper in `client/src/lib/api.ts`.

## Layers

**Presentation Layer (Web UI):**
- Purpose: Render admin UI, capture user actions, and show command outcomes.
- Location: `client/src/pages/`, `client/src/components/`, `client/src/App.tsx`, `client/src/main.tsx`
- Contains: Route config, page views, layout, toast UX, client-side log streaming.
- Depends on: API client (`client/src/lib/api.ts`) and logger (`client/src/lib/logger.ts`).
- Used by: End users via browser.

**API Layer (HTTP + WS):**
- Purpose: Expose authenticated REST endpoints and WebSocket log stream.
- Location: `server/index.ts`, `server/lib/websocket.ts`
- Contains: Route handlers, auth gate attachment (`app.use("/api", authMiddleware)`), static file serving, SPA fallback, HTTP upgrade handling.
- Depends on: Domain services in `server/lib/*.ts` and auth helpers in `server/lib/auth.ts`.
- Used by: SPA calls from `client/src/lib/api.ts` and browser WebSocket in `client/src/pages/AppDetail.tsx`.

**Domain/Service Layer:**
- Purpose: Validate/sanitize inputs and implement Dokku operations per feature.
- Location: `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/server.ts`
- Contains: App lifecycle, config vars, domains, DB management, SSL, host health parsing.
- Depends on: Command execution abstraction in `server/lib/executor.ts` (except log streaming process spawn in `server/lib/websocket.ts`).
- Used by: API route handlers in `server/index.ts`.

**Infrastructure Layer:**
- Purpose: Cross-cutting concerns: command allowlisting, command history persistence, JWT/session auth, logging.
- Location: `server/lib/executor.ts`, `server/lib/allowlist.ts`, `server/lib/db.ts`, `server/lib/auth.ts`, `server/lib/logger.ts`
- Contains: Shell execution + allowlist checks, SQLite history table, cookie JWT lifecycle, pino logging.
- Depends on: `better-sqlite3`, `jsonwebtoken`, `pino` from `server/package.json`.
- Used by: API and domain modules.

## Data Flow

**Authenticated Management Request:**
1. UI triggers `apiFetch()` in `client/src/lib/api.ts` from pages like `client/src/pages/Dashboard.tsx` or `client/src/pages/AppDetail.tsx`.
2. Express route in `server/index.ts` receives request; `/api/*` (except auth endpoints) passes through `authMiddleware` from `server/lib/auth.ts`.
3. Route delegates to domain module (for example `getAppDetail` in `server/lib/apps.ts`).
4. Domain module calls `executeCommand()` in `server/lib/executor.ts`; allowlist enforced by `server/lib/allowlist.ts` and result recorded via `saveCommand()` in `server/lib/db.ts`.
5. Result returns as JSON to frontend; UI updates local state and optional toast via `client/src/components/ToastProvider.tsx`.

**Live Logs Flow:**
1. `client/src/pages/AppDetail.tsx` opens `ws(s)://.../api/apps/:name/logs/stream`.
2. Upgrade is intercepted and authenticated in `server/lib/websocket.ts` using `verifyToken()` from `server/lib/auth.ts`.
3. Server spawns `dokku logs` process and forwards each line to client over WebSocket in `server/lib/websocket.ts`.

**State Management:**
- Frontend uses local React state/hooks per page (`useState`/`useEffect`) in `client/src/pages/*.tsx`.
- Backend keeps persistent command history in SQLite (`server/lib/db.ts`, `data/docklight.db`) and stateless API responses per request.

## Key Abstractions

**Command Execution Boundary:**
- Purpose: Centralized shell execution policy + audit trail.
- Examples: `server/lib/executor.ts`, `server/lib/allowlist.ts`, `server/lib/db.ts`
- Pattern: Wrapper/facade around `child_process.exec` with allowlist + persistence.

**Feature Service Modules:**
- Purpose: One module per operational domain (apps/config/domains/databases/ssl/health).
- Examples: `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/server.ts`
- Pattern: Function-oriented service modules returning either typed success data or structured error objects.

**Session Auth Helpers:**
- Purpose: Encapsulate login token issuance, verification, cookie handling, and middleware checks.
- Examples: `server/lib/auth.ts`, auth routes in `server/index.ts`
- Pattern: Utility + Express middleware abstraction.

## Entry Points

**Backend HTTP Server:**
- Location: `server/index.ts`
- Triggers: `bun run dev`, `bun start` from `server/package.json`.
- Responsibilities: Build Express app, register API routes, serve `client/dist`, attach SPA fallback, create HTTP server, initialize WebSocket streaming.

**Frontend SPA Bootstrap:**
- Location: `client/src/main.tsx`
- Triggers: Vite runtime (`bun run dev`, `bun run build`) from `client/package.json`.
- Responsibilities: Mount React root and render routed application from `client/src/App.tsx`.

**WebSocket Upgrade Path:**
- Location: `server/lib/websocket.ts`
- Triggers: Browser upgrade requests to `/api/apps/:name/logs/stream` from `client/src/pages/AppDetail.tsx`.
- Responsibilities: Authenticate session cookie, validate app name, stream Dokku logs.

## Error Handling

**Strategy:** Return structured error payloads from service functions and propagate to UI through JSON responses.

**Patterns:**
- Shell and parse operations use try/catch and return `{ error, command, exitCode, stderr }` in modules like `server/lib/apps.ts`, `server/lib/config.ts`, and `server/lib/server.ts`.
- Frontend catches request failures and surfaces user-facing state/toasts in `client/src/pages/Dashboard.tsx`, `client/src/pages/AppDetail.tsx`, and `client/src/pages/Databases.tsx`.

## Cross-Cutting Concerns

**Logging:** pino logger instances in `server/lib/logger.ts` and `client/src/lib/logger.ts`; HTTP logging middleware is attached in `server/index.ts` via `pino-http`.

**Validation:** Input guards and sanitization are done in feature modules (examples: `isValidAppName()` in `server/lib/apps.ts`, env key/value checks in `server/lib/config.ts`, domain/plugin/name checks in `server/lib/domains.ts` and `server/lib/databases.ts`).

**Authentication:** Cookie-based JWT auth implemented in `server/lib/auth.ts`, enforced for API routes in `server/index.ts`, and checked for WebSocket upgrades in `server/lib/websocket.ts`.

---

*Architecture analysis: 2026-02-27*
