# Architecture

**Analysis Date:** 2026-03-07

## Pattern Overview

**Overall:** Three-tier client-server architecture with remote command execution

**Key Characteristics:**
- Monolithic backend (Express) with SQLite for persistence
- React SPA client with React Router
- Remote execution via SSH to Dokku server
- WebSocket for real-time log streaming
- SSE for long-running command progress

## Layers

**Client Layer (React SPA):**
- Purpose: User interface and client-side state management
- Location: `client/src/`
- Contains: React components, pages, hooks, API client
- Depends on: Server REST API, WebSocket server
- Used by: End users via web browser

**API Layer (Express Routes):**
- Purpose: HTTP endpoints and request handling
- Location: `server/routes/`
- Contains: Route handlers, middleware, request validation
- Depends on: Business logic in `server/lib/`, authentication middleware
- Used by: Client layer

**Business Logic Layer:**
- Purpose: Core application logic and Dokku interactions
- Location: `server/lib/`
- Contains: Command execution, data processing, validation
- Depends on: SSH executor, database, Dokku commands
- Used by: API layer

**Remote Execution Layer:**
- Purpose: Execute commands on remote Dokku server
- Location: `server/lib/executor.ts`, `server/lib/dokku.ts`
- Contains: SSH connection pool, command building, execution
- Depends on: node-ssh library, Dokku CLI
- Used by: Business logic layer

**Data Layer:**
- Purpose: Persistent storage
- Location: `server/lib/db.ts`
- Contains: SQLite database operations, prepared statements
- Depends on: better-sqlite3
- Used by: Business logic layer

## Data Flow

**Request Flow:**
1. Browser sends HTTP request to Express server
2. Request passes through authentication middleware (`authMiddleware`)
3. Route handler calls business logic function (in `lib/`)
4. Business logic executes remote SSH commands via executor
5. Result returned to route handler
6. Response sent back to client

**Real-time Log Streaming:**
1. Client connects via WebSocket (`server/lib/websocket.ts`)
2. WebSocket handler executes `dokku logs` command via SSH
3. Log lines streamed to client in real-time

**Command Execution with SSE:**
1. Client sends request with `Accept: text/event-stream`
2. Server sends progress updates via SSE
3. Final result sent when command completes

**State Management:**
- Server-side: SQLite for audit logs and settings
- Client-side: TanStack Query for server state caching and synchronization

## Key Abstractions

**Command Execution:**
- Purpose: Encapsulate Dokku CLI command building and execution
- Examples: `server/lib/dokku.ts`, `server/lib/executor.ts`
- Pattern: Command builder pattern (`DokkuCommands` class), executor with timeout and error handling

**Route Organization:**
- Purpose: Modular API endpoint registration
- Examples: `server/routes/apps.ts`, `server/routes/auth.ts`
- Pattern: One route file per resource, exports `register*Routes` functions

**Audit Logging:**
- Purpose: Track all executed commands
- Examples: `server/lib/db.ts` (`saveCommand`), `server/lib/audit-rotation.ts`
- Pattern: Async logging with automatic cleanup and truncation

**SSE Streaming:**
- Purpose: Real-time command progress updates
- Examples: `server/lib/sse.ts`
- Pattern: Writer interface with typed methods

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: Node.js process start
- Responsibilities: Express app setup, route registration, WebSocket server setup, graceful shutdown handling

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads application
- Responsibilities: React app mount, router setup

**Build Entry Points:**
- Server: `server/index.ts` → `dist/index.js`
- Client: `client/src/main.tsx` → `client/dist/index.html`

## Error Handling

**Strategy:** Return standardized error objects, never throw exceptions from command execution

**Patterns:**
- Command execution returns `{ command, exitCode, stdout, stderr }`
- Validation errors return `{ error, command, exitCode, stderr }`
- HTTP responses use appropriate status codes (400, 401, 500, etc.)
- Pino for structured error logging

## Cross-Cutting Concerns

**Logging:** Pino structured logging, HTTP requests logged via pino-http middleware

**Validation:** Zod schemas for client validation, custom validation functions for server-side input

**Authentication:** JWT-based authentication with HTTP-only cookies, protected by `authMiddleware`

**Rate Limiting:** API and command execution rate-limited using express-rate-limit

**Command Allowlisting:** `server/lib/allowlist.ts` ensures only whitelisted commands can execute

---

*Architecture analysis: 2026-03-07*
