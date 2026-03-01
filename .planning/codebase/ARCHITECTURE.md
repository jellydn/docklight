# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Three-tier web application with command executor pattern

**Key Characteristics:**
- Client-server SPA architecture with React frontend and Express backend
- SSH-based remote command execution for Dokku management
- SQLite database for audit trails, authentication, and command history
- WebSocket for real-time log streaming
- Role-based access control (RBAC) with multi-user support

## Layers

**Presentation Layer (Client):**
- Purpose: React single-page application providing web UI for Dokku management
- Location: `client/src/`
- Contains: React components, pages, API client, routing
- Depends on: Express REST API
- Used by: End users via web browser

**API Layer (Server):**
- Purpose: Express REST API handling authentication, request routing, and response formatting
- Location: `server/index.ts`
- Contains: HTTP route handlers, middleware, cookie-based auth
- Depends on: Business logic layer (lib/), WebSocket server
- Used by: React client

**Business Logic Layer:**
- Purpose: Core domain logic for Dokku operations, caching, and data transformation
- Location: `server/lib/`
- Contains: Feature modules (apps.ts, databases.ts, plugins.ts, etc.), command builders, parsers
- Depends on: Executor layer, Database layer
- Used by: API layer

**Executor Layer:**
- Purpose: Secure shell command execution with SSH pooling and allowlist validation
- Location: `server/lib/executor.ts`, `server/lib/dokku.ts`
- Contains: SSH connection pooling, command building, timeout handling, sudo support
- Depends on: NodeSSH library, child_process
- Used by: Business logic layer

**Data Layer:**
- Purpose: Persistent storage for users, audit logs, and command history
- Location: `server/lib/db.ts`, `data/docklight.db`
- Contains: SQLite database, prepared statements, schema migrations
- Depends on: better-sqlite3
- Used by: Business logic layer, auth module

**WebSocket Layer:**
- Purpose: Real-time log streaming from Dokku containers to browser
- Location: `server/lib/websocket.ts`
- Contains: WebSocket server setup, log tailing, client connection management
- Depends on: ws library, executor
- Used by: API layer (attached to HTTP server)

## Data Flow

**User Request Flow:**
1. Browser initiates action (e.g., restart app)
2. React component calls `apiFetch()` with schema validation
3. Request sent to Express API with authentication cookie
4. API validates auth/role via middleware
5. Route handler calls business logic function (e.g., `restartApp()`)
6. Business logic builds Dokku command via `DokkuCommands` builder
7. Executor validates command against allowlist
8. SSH connection (pooled) executes command on Dokku server
9. Result parsed, saved to command history, cached
10. Response returned to client with status/error details
11. React updates UI with toast notification

**Log Streaming Flow:**
1. Client connects via WebSocket to `/logs`
2. Server spawns `dokku logs -t -n` process via executor
3. Process output streamed line-by-line to WebSocket client
4. Client renders ANSI-parsed logs in terminal component
5. Connection closed on tab close or timeout

**Authentication Flow:**
1. POST `/api/auth/login` with username/password (multi-user) or password only (single-user)
2. Server verifies against SQLite users table (or env password in legacy mode)
3. JWT token generated and stored in httpOnly cookie
4. Subsequent requests validated via `authMiddleware` middleware
5. Role-based access enforced via `requireAdmin` for sensitive operations

**State Management:**
- Server-side: In-memory cache with TTL for apps/databases lists, SQLite for persistence
- Client-side: React useState/useEffect hooks, no global state management
- Authentication: JWT tokens in httpOnly cookies

## Key Abstractions

**Command Builder Pattern:**
- Purpose: Centralized Dokku CLI command construction for version compatibility
- Examples: `server/lib/dokku.ts` - DokkuCommands object with fluent command builders
- Pattern: Object with command methods returning shell command strings, decoupling CLI syntax from business logic

**Executor Abstraction:**
- Purpose: Unified interface for local/remote command execution with security and pooling
- Examples: `server/lib/executor.ts` - executeCommand(), SSHPool class
- Pattern: Facade over child_process and NodeSSH with allowlist validation and timeout handling

**API Fetch with Validation:**
- Purpose: Type-safe API calls with automatic schema validation
- Examples: `client/src/lib/api.ts` - apiFetch() function, Zod schemas
- Pattern: Higher-order fetch wrapper with Zod validation, error handling, and auth redirect

**Feature Modules:**
- Purpose: Coherent business logic per Dokku feature domain
- Examples: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/plugins.ts`
- Pattern: Module exports domain functions, uses DokkuCommands and executeCommand internally

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: `bun run dev` or `node dist/index.js`
- Responsibilities: Express app setup, middleware configuration, route registration, HTTP server creation, WebSocket attachment

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads bundled JavaScript
- Responsibilities: React root rendering, StrictMode wrapper

**App Root Component:**
- Location: `client/src/App.tsx`
- Triggers: React mount
- Responsibilities: BrowserRouter setup, route configuration, Toaster placement, global providers

## Error Handling

**Strategy:** Return error objects with exitCode, never throw for command failures

**Patterns:**
- Command results always return `{ exitCode, stdout, stderr, command }` objects
- API responses use HTTP status codes (400, 401, 404, 409, 500) with error details
- Client shows toast notifications from error responses
- Failed commands logged to SQLite command_history table
- SSH failures include helpful hints (sudo configuration, target setup)

## Cross-Cutting Concerns

**Logging:** Pino structured logging with pino-http middleware for HTTP requests

**Validation:** Zod schemas for API responses, command allowlist for security, input validation on routes

**Authentication:** JWT tokens in httpOnly cookies, middleware-based auth, RBAC with admin/operator/viewer roles

**Caching:** In-memory key-value cache with TTL for expensive operations (apps:list, database lists)

**Security:** Command allowlist preventing arbitrary shell execution, SSH key-based auth, rate limiting on auth endpoints, password hashing with bcrypt

**Testing:** Vitest for unit/integration tests, Testing Library for React components, supertest for API endpoints

---

*Architecture analysis: 2026-03-01*
