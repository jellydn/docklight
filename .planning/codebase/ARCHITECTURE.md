# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Backend-for-Frontend (BFF) with Server-Side Rendering SPA

**Key Characteristics:**
- Microservices-like separation: independent server and client
- Thin client, thick server (business logic in Express backend)
- Command execution wrapper pattern (Dokku CLI abstraction)
- WebSocket streaming for real-time data (logs)
- Caching layer for performance optimization
- Command allowlist security pattern

## Layers

**Presentation Layer:**
- Purpose: User interface and routing
- Location: `client/src`
- Contains: React components, pages, hooks, contexts
- Depends on: `client/src/lib/api.ts`
- Used by: Browser (directly)

**API Layer:**
- Purpose: HTTP request handling and routing
- Location: `server/routes`
- Contains: Express route handlers organized by domain
- Depends on: `server/lib` modules
- Used by: Presentation layer (client)

**Service Layer:**
- Purpose: Domain logic and business rules
- Location: `server/lib`
- Contains: Modular service functions for each domain
- Depends on: `server/lib/executor.ts`
- Used by: API layer (routes)

**Execution Layer:**
- Purpose: Shell command execution and SSH management
- Location: `server/lib/executor.ts`
- Contains: Command execution, SSH connection pooling, security
- Depends on: `server/lib/allowlist.ts`
- Used by: Service layer (all lib modules)

**Database Layer:**
- Purpose: Data persistence and command audit trail
- Location: `server/lib/db.ts`
- Contains: SQLite operations with prepared statements
- Depends on: better-sqlite3
- Used by: Auth layer, command history

## Data Flow

**App Request Flow:**
1. Browser requests page → `client/src/main.tsx` mounts React app
2. Client renders pages → `client/src/App.tsx` sets up routing
3. User action triggers API call → `client/src/lib/api.ts` makes HTTP request
4. API route handler processes → `server/routes/*.ts` receives request
5. Route validates auth → `server/lib/auth.ts` middleware
6. Service layer executes logic → `server/lib/*.ts`
7. Command executor runs → `server/lib/executor.ts` executes Dokku CLI via SSH or shell
8. Response returns → client receives data and updates UI

**Log Streaming Flow:**
1. User opens app logs → `server/routes/app-ports.ts` GET /api/apps/:name/logs/stream
2. WebSocket connection established → `server/lib/websocket.ts` setupLogStreaming
3. SSH tunnel opens → `dokku logs` command runs via SSH connection pool
4. Real-time output streams → WebSocket messages sent to client
5. Connection cleaned up → idle timeout or close event

**State Management:**
- Client: React context (auth), localStorage for tokens
- Server: In-memory cache with TTL (performance), SQLite for persistence
- No global state management library (lightweight approach)

## Key Abstractions

**Command Executor:**
- Purpose: Centralized command execution wrapper
- Examples: `server/lib/executor.ts`
- Pattern: Command pattern with SSH pooling and retry logic

**Dokku Command Builder:**
- Purpose: Centralized Dokku CLI command definitions
- Examples: `server/lib/dokku.ts`
- Pattern: Builder pattern for version compatibility

**SSHPool:**
- Purpose: Persistent SSH connection management
- Examples: `server/lib/executor.ts` SSHPool class
- Pattern: Object pool with TTL cleanup

**Command Allowlist:**
- Purpose: Security validation for shell commands
- Examples: `server/lib/allowlist.ts`
- Pattern: Whitelist validation with regex

**Cache Layer:**
- Purpose: Performance optimization with TTL
- Examples: `server/lib/cache.ts`
- Pattern: In-memory map with TTL expiration

## Entry Points

**Server Entry:**
- Location: `server/index.ts`
- Triggers: `bun run dev` / `bun start`
- Responsibilities:
  - Initialize Express app
  - Setup middleware (cookie-parser, pino-http)
  - Register route modules
  - Serve static client files
  - Create HTTP server
  - Setup WebSocket log streaming

**Client Entry:**
- Location: `client/src/main.tsx`
- Triggers: `bun run dev` / production build
- Responsibilities:
  - Mount React app to root div
  - Setup routing (React Router)
  - Load authentication context
  - Initialize toast notifications (sonner)

## Error Handling

**Strategy:** Graceful degradation with detailed error reporting

**Patterns:**
- Command execution errors (executor.ts): Return `CommandResult` with exitCode, stdout, stderr
- Route handlers: Use `CommandResultLike` type with proper status codes
- Security: Command allowlist validation before execution
- Authentication: JWT verification with 401 responses
- Rate limiting: 429 Too Many Requests with Retry-After header
- Database: Try-catch with fallback error messages
- SSH: Retry logic with error messages for auth failures

**Error Response Format:**
```typescript
{
  error?: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}
```

## Cross-Cutting Concerns

**Logging:** Pino structured logging
- Location: `server/lib/logger.ts`
- Contextual logging with error objects
- HTTP request logs via pino-http middleware
- Log level via `LOG_LEVEL` env var

**Validation:** Input validation in routes and services
- Route params validation
- Request body type checking
- Command allowlist validation
- No schema validation libraries (simple validation)

**Authentication:** JWT-based session management
- Location: `server/lib/auth.ts`
- Hash passwords with scrypt
- JWT tokens with 24h expiration
- HttpOnly cookies for security
- Role-based access control (user/admin/operator)
- Rate limiting for auth endpoints

**Caching:** In-memory cache with TTL
- Location: `server/lib/cache.ts`
- 30-second default TTL (configurable)
- Key-based access
- Prefix-based invalidation
- Cache statistics for debugging

**Real-time:** WebSocket log streaming
- Location: `server/lib/websocket.ts`
- Maximum 50 connections
- 30-minute idle timeout
- Automatic connection cleanup
- Ping/pong health checks

---

*Architecture analysis: 2026-03-02*
