# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Client-Server SPA with Shell Execution Bridge

**Key Characteristics:**
- Monorepo structure with separate server and client
- RESTful API backend with shell command execution
- React SPA with client-side routing
- WebSocket for real-time log streaming
- Command allowlist for security (only approved shell commands)

## Layers

**API Layer (Express Routes):**
- Purpose: HTTP endpoints for Dokku operations
- Location: `server/index.ts`
- Contains: Route definitions, auth middleware, cookie handling
- Depends on: Library modules (apps, databases, plugins, etc.)
- Used by: React client via fetch API

**Business Logic Layer:**
- Purpose: Dokku command orchestration and data transformation
- Location: `server/lib/*.ts`
- Contains: App management, database operations, plugin management, SSL, domains
- Depends on: Command executor, cache, logger
- Used by: API layer

**Execution Layer:**
- Purpose: Safe shell command execution with timeout
- Location: `server/lib/executor.ts`
- Contains: Command execution, timeout handling, exit code parsing
- Depends on: Node.js child_process
- Used by: Business logic layer

**Client Layer (React SPA):**
- Purpose: User interface for Dokku management
- Location: `client/src/`
- Contains: Pages, components, API client, routing
- Depends on: Server API
- Used by: End users via browser

## Data Flow

**Request Flow:**
1. Browser → React SPA makes API call
2. Vite dev server proxies `/api` requests to Express server (port 3001)
3. Express validates auth cookie
4. Route handler calls business logic function
5. Business logic validates input and executes command via executor
6. Executor spawns shell process with timeout
7. Result parsed and returned as JSON
8. Response flows back through layers to browser

**Real-time Log Streaming:**
1. Client connects via WebSocket to `/api/logs/stream`
2. Server authenticates via cookie
3. Server spawns `dokku logs` process
4. stdout chunks forwarded to WebSocket clients
5. Browser receives log lines in real-time

**State Management:**
- Client: React useState/useReducer for local component state
- Server: In-memory LRU cache for expensive queries (apps, databases)
- Database: SQLite for command history (audit log)

## Key Abstractions

**CommandResult:**
- Purpose: Standardized shell command result
- Examples: `server/lib/executor.ts`
- Pattern: `{ command, exitCode, stdout, stderr }`

**App / AppDetail:**
- Purpose: Dokku application representation
- Examples: `server/lib/apps.ts`
- Pattern: Interface with name, status, domains, processes

**Cache Key Pattern:**
- Purpose: Prevent redundant expensive commands
- Examples: `server/lib/cache.ts`
- Pattern: Prefix-based invalidation (`apps:*`, `databases:*`)

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: `bun run dev` or `node dist/index.js`
- Responsibilities: Express app setup, middleware, routes, WebSocket server

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Vite dev server or browser loads built bundle
- Responsibilities: React root render, router setup

## Error Handling

**Strategy:** Return error objects rather than throw

**Patterns:**
- Shell commands return `{ exitCode, stderr }` on failure
- API responses use appropriate HTTP status codes
- Client shows toast notifications (Sonner) for errors
- Validation errors return 400 with descriptive message

## Cross-Cutting Concerns

**Logging:** Pino structured logging with context, auto-request logging via pino-http

**Validation:** Zod schemas on client, manual validation in server business logic

**Authentication:** Cookie-based sessions with JWT tokens, auth middleware on `/api` routes

**Security:** Command allowlist, rate limiting on auth endpoint, httpOnly cookies

---

*Architecture analysis: 2026-02-28*
