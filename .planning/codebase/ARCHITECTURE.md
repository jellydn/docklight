# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Client-Server with SSH Orchestration

**Key Characteristics:**
- Monolithic backend (Express) + SPA frontend (React)
- SSH-based command execution to Dokku
- No microservices
- Stateful backend (SQLite database)
- WebSocket for real-time log streaming

## Layers

**Presentation Layer (Client):**
- Purpose: React SPA user interface
- Location: `client/src/`
- Contains: React components, pages, hooks
- Depends on: API endpoints via `@tanstack/react-query`
- Used by: Browser

**API Layer (Server Routes):**
- Purpose: HTTP endpoint handlers
- Location: `server/routes/`
- Contains: Route registration, request validation, response formatting
- Depends on: Business logic in `server/lib/`, authentication middleware
- Used by: React client

**Business Logic Layer:**
- Purpose: Core application logic and Dokku interactions
- Location: `server/lib/`
- Contains: App management, database operations, SSH execution, auth
- Depends on: Dokku CLI, SQLite database, SSH connection pool
- Used by: API routes

**Data Layer:**
- Purpose: Persistent storage
- Location: `server/lib/db.ts`, `server/data/docklight.db`
- Contains: SQLite schema, prepared statements
- Depends on: better-sqlite3
- Used by: Business logic layer

## Data Flow

**Request Flow:**
1. Browser → React SPA (client/src/)
2. React → API fetch (`client/src/lib/api.ts`)
3. API Route (`server/routes/*.ts`) → Business Logic (`server/lib/*.ts`)
4. Business Logic → SSH Execution (`server/lib/executor.ts`) → Dokku CLI
5. Dokku CLI → Docker
6. Response flows back through the chain

**WebSocket Flow (Logs):**
1. Client connects via WebSocket
2. Server authenticates via session token
3. Server spawns SSH connection and streams stdout/stderr
4. Client receives real-time log lines

**State Management:**
- Server: SQLite for persistent state, in-memory cache for ephemeral data
- Client: @tanstack/react-query for server state, React Context for auth

## Key Abstractions

**Command Execution:**
- Purpose: Abstract SSH vs local shell execution
- Examples: `server/lib/executor.ts`, `server/lib/dokku.ts`
- Pattern: Result objects with `{command, exitCode, stdout, stderr}`

**App Management:**
- Purpose: Dokku app CRUD operations
- Examples: `server/lib/apps.ts`, `server/lib/databases.ts`
- Pattern: Parse CLI output into typed objects

**Authentication:**
- Purpose: JWT-based session management
- Examples: `server/lib/auth.ts`
- Pattern: Middleware guards (`authMiddleware`, `requireRole`, `requireAdmin`)

**Rate Limiting:**
- Purpose: Prevent abuse of expensive operations
- Examples: `server/lib/rate-limiter.ts`
- Pattern: Sliding window per-user rate limiting

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: `bun run dev` or `node dist/index.js`
- Responsibilities: Express app setup, route registration, WebSocket server, graceful shutdown

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads the SPA
- Responsibilities: React app mounting, query client setup

**Admin User Creation:**
- Location: `server/createUser.ts`
- Triggers: `npx tsx createUser.ts <username> <password>`
- Responsibilities: Create initial admin user

## Error Handling

**Strategy:** Never throw for expected failures

**Patterns:**
- Return error objects: `{error: string, command?: string, exitCode?: number, stderr?: string}`
- Validate early: Route-level validation for app names, params
- Graceful degradation: Parse failures return empty arrays, not errors
- SSH errors: Return error result objects, preserve command details
- Rate limit exceeded: Return 429 with retry-after time

## Cross-Cutting Concerns

**Logging:**
- Pino structured logging (server/lib/logger.ts)
- HTTP request logging via pino-http
- Audit logging for all command executions

**Validation:**
- Server: Runtime type checking via TypeScript
- Client: Zod schemas for API responses (`client/src/lib/schemas.ts`)
- Route-level validation for app names, parameters

**Authentication:**
- JWT tokens in httpOnly cookies
- Middleware guards on protected routes
- Role-based access control (admin, operator, viewer)

**Caching:**
- Simple in-memory cache (`server/lib/cache.ts`)
- Cache keys follow pattern: `<entity>:<id>:<attribute>`
- Invalidated on write operations

---

*Architecture analysis: 2026-03-11*
