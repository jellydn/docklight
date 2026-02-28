# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Client-Server with SSH-based Command Execution

**Key Characteristics:**
- Single-page React application communicating via REST API
- Express server executes Dokku commands over SSH
- No state shared between requests (except SQLite DB for history)
- WebSocket for real-time log streaming
- JWT-based session authentication

## Layers

**Presentation Layer (Client):**
- Purpose: React UI for Dokku management
- Location: `client/src/`
- Contains: Pages, components, routing, API client
- Depends on: Express API
- Used by: Browser users

**API Layer (Server):**
- Purpose: HTTP endpoints and WebSocket server
- Location: `server/index.ts`, `server/lib/server.ts`
- Contains: Route handlers, middleware, auth
- Depends on: Business logic layer, executor
- Used by: React client

**Business Logic Layer:**
- Purpose: Domain-specific operations (apps, databases, plugins, etc.)
- Location: `server/lib/*.ts` (apps.ts, databases.ts, plugins.ts, etc.)
- Contains: Functions that format and execute Dokku commands
- Depends on: Executor, database
- Used by: API layer

**Executor Layer:**
- Purpose: Execute shell commands via SSH
- Location: `server/lib/executor.ts`
- Contains: SSH connection, command execution, allowlist validation
- Depends on: Dokku server (via SSH)
- Used by: Business logic layer

## Data Flow

**Typical Request (e.g., restart app):**
1. User clicks "Restart" button in React UI
2. Client makes POST request to `/api/apps/:name/restart` with JWT cookie
3. Server middleware validates JWT token
4. Route handler calls `apps.restart(name)` in `server/lib/apps.ts`
5. Business logic formats command string (e.g., `dokku ps:restart appname`)
6. Executor validates command against allowlist
7. Executor opens SSH connection to Dokku server
8. Executor runs command and captures stdout/stderr/exit code
9. Business logic returns CommandResult to API
10. API responds with JSON `{ command, exitCode, stdout, stderr }`
11. Client displays toast notification with result

**WebSocket Connection (logs):**
1. User navigates to Logs tab
2. Client opens WebSocket to `/api/apps/:name/logs/stream`
3. Server establishes WebSocket connection
4. Client sends message with desired line count
5. Server spawns Dokku logs process via SSH
6. Server streams each log line to client via WebSocket
7. Client appends lines to log viewer
8. On disconnect/tab change, server kills SSH process

**State Management:**
- Client-side: React useState/useEffect (no Redux/Zustand)
- Server-side: Stateless (except SQLite DB for history)

## Key Abstractions

**CommandResult:**
- Purpose: Represents shell command execution result
- Examples: `client/src/components/types.ts`, `server/index.ts`
- Pattern: Interface with command, exitCode, stdout, stderr

**Executor Function:**
- Purpose: Generic SSH command execution with allowlist validation
- Examples: `server/lib/executor.ts`
- Pattern: Async function taking command string, returning CommandResult

**Toast Notifications:**
- Purpose: User feedback for async operations
- Examples: `client/src/components/ToastProvider.tsx`
- Pattern: Context provider with addToast(type, title, result) function

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: `bun run dev` or `node dist/index.js`
- Responsibilities:
  - Initialize Express app
  - Configure middleware (CORS, JSON parsing, logging, auth)
  - Register routes
  - Start HTTP server
  - Initialize WebSocket server

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads the app
- Responsibilities:
  - Mount React app
  - Configure Router
  - Wrap with ToastProvider

**Vite Dev Server:**
- Location: `client/` (configured via Vite conventions)
- Triggers: `bun run dev` in client directory
- Responsibilities:
  - Serve React app
  - Proxy /api requests to Express server (port 3001)
  - Hot module replacement

## Error Handling

**Strategy:** Return structured errors, don't throw

**Patterns:**
- All executor calls wrapped in try-catch
- Errors returned as CommandResult with exitCode=1
- Client checks exitCode and displays appropriate toast
- No global error handlers (errors local to operations)

## Cross-Cutting Concerns

**Logging:** Pino structured logging with pino-http middleware

**Validation:** Command allowlist in `server/lib/allowlist.ts` - only approved commands can execute

**Authentication:** JWT middleware on protected routes, cookie-based sessions

---

*Architecture analysis: 2026-02-28*
