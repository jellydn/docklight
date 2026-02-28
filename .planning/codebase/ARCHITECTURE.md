# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Client-Server Architecture with Centralized Command Execution

**Key Characteristics:**
- Monolithic backend server with RESTful API
- React SPA frontend with client-side routing
- SSH-based remote command execution via Node SSH
- In-memory caching for performance
- SQLite for audit logging
- WebSocket for real-time log streaming
- JWT-based authentication with rate limiting
- Command allowlist for security

## Layers

**API Layer (Backend Entry Point):**
- Purpose: HTTP request handling, routing, and API endpoint definitions
- Location: `server/index.ts` (693 lines)
- Contains: All API routes, middleware setup, static file serving
- Depends on: All lib modules (apps, auth, dokku, executor, etc.)
- Used by: React frontend via API calls

**Business Logic Layer:**
- Purpose: Domain-specific business logic and Dokku command abstraction
- Location: `server/lib/*.ts` (32 modules, 5814 lines)
- Contains: Command builders, validators, state managers, helpers
- Depends on: executor.ts (for shell execution), db.ts (for logging), logger.ts
- Used by: API layer and some lib modules

**Command Execution Layer:**
- Purpose: SSH connection pooling and shell command execution
- Location: `server/lib/executor.ts` (378 lines)
- Contains: SSHPool class, command builders, security utilities
- Depends on: node-ssh, allowlist.ts (security), logger.ts
- Used by: All business logic modules via executeCommand()

**Data Persistence Layer:**
- Purpose: Persistent storage for audit logs and caching
- Location: `server/lib/db.ts` (147 lines) and `server/lib/cache.ts` (87 lines)
- Contains: SQLite command history, in-memory cache with TTL
- Depends on: better-sqlite3
- Used by: db.ts (audit), cache.ts (performance), all lib modules

**Presentation Layer (Frontend):**
- Purpose: User interface and client-side state management
- Location: `client/src/` (36 files, 7943 lines)
- Contains: Pages, components, API client, utilities
- Depends on: React Router for navigation, Zod for validation, custom hooks
- Used by: Browser users via SPA

## Data Flow

**Command Execution Flow:**
1. User triggers action in UI (e.g., restart app)
2. Frontend calls API endpoint (e.g., `POST /api/apps/:name/restart`)
3. API handler in index.ts validates input and calls lib module (apps.ts)
4. Lib module builds Dokku command using DokkuCommands interface
5. Executor builds SSH command with sudo support if needed
6. SSHPool establishes SSH connection if needed
7. Command executed on remote server
8. Result (stdout, stderr, exitCode) returned
9. Frontend displays result to user
10. Audit log saved to SQLite via db.ts

**Authentication Flow:**
1. User enters password on login page
2. POST /api/auth/login validates password
3. If valid, JWT token generated with 24h expiry
4. Token set in httpOnly cookie
5. Subsequent requests send cookie
6. authMiddleware validates token for API requests
7. Rate limiter enforces 5 attempts per 15 min window

**Log Streaming Flow:**
1. Frontend requests WebSocket connection
2. WebSocket upgrade request parsed from URL (/api/apps/:name/logs/stream)
3. JWT token validated from cookie
4. WebSocket server spawns dokku logs process
5. Process stdout streamed in real-time to client
6. Client displays logs as they arrive

**State Management:**
- Server: In-memory cache (cache.ts) with 30s TTL for app lists and databases
- Client: React Router for navigation state, local component state, no global store
- Data persistence: SQLite for audit logs (immutable)

## Key Abstractions

**DokkuCommands Interface:**
- Purpose: Centralized abstraction for all Dokku CLI commands
- Examples: `server/lib/dokku.ts` (240 lines)
- Pattern: Builder pattern - each method returns complete shell command string
- Used by: All lib modules to build safe, validated commands

**SSHPool Class:**
- Purpose: Persistent SSH connections to avoid per-command handshake overhead
- Examples: `server/lib/executor.ts` (lines 89-195)
- Pattern: Connection pool with idle timeout (5 minutes)
- Features: Sudo password handling, connection reuse, automatic cleanup

**CommandResult Interface:**
- Purpose: Standardized return type for all command executions
- Examples: `server/lib/executor.ts` (lines 9-14)
- Pattern: Result object with exitCode, stdout, stderr, command
- Used by: All lib modules for consistent error handling

**App, AppDetail, CommandResult:**
- Purpose: TypeScript interfaces for domain data structures
- Examples: `server/lib/apps.ts`, `server/lib/schemas.ts`
- Pattern: Shared types between server and client for type safety
- Used by: API responses, frontend data models

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts` (line 690-693)
- Triggers: Node process start, listens on PORT (default 3001)
- Responsibilities:
  - Initialize Express app with middleware (pino-http, cookie-parser)
  - Set up all API routes (60+ endpoints)
  - Serve static files from client/dist
  - Setup WebSocket server for log streaming
  - Create HTTP server and start listening

**Client Entry Points:**
- Main: `client/src/main.tsx` (lines 1-10) - React root render
- Router: `client/src/App.tsx` (lines 13-44) - Routes configuration
- Triggers: Browser loads, SPA hydration
- Responsibilities:
  - Mount React app
  - Configure React Router with protected routes
  - Setup Toast notifications
  - Proxy API requests to server in dev

**Dokku CLI (External):**
- Location: Remote server, installed separately
- Triggers: Called by server via SSH
- Responsibilities: Docker container management, app lifecycle, SSL

## Error Handling

**Strategy:** Fail-safe with rich error information

**Patterns:**
- Result-based errors (CommandResult interface with exitCode, stderr)
- Status code mapping (400 for client errors, 500 for server errors)
- Command transparency (exact command executed logged in stderr)
- Security validation (command allowlist before execution)
- Try-catch with type guards for async operations
- Graceful degradation (fallback commands, cache failures)

**Examples:**
- Authentication: 401 Unauthorized with error message
- Validation: 400 with specific error details
- Command failures: Return CommandResult with exitCode, stdout, stderr
- Rate limiting: 429 with retry-after header
- WebSocket errors: Close connection with 401 if unauthenticated

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino (structured logging)
- Middleware: pino-http for automatic HTTP request logging
- Module: server/lib/logger.ts with configurable log level
- Context: Log errors with command and error details
- Format: JSON for production, human-readable for development

**Validation:**
- Input validation: Request body validation, parameter validation
- Pattern: Zod schemas in server/lib/schemas.ts (174 lines)
- Client-side: Zod validation on API responses (apiFetch with schema param)
- Server-side: Input validation before command execution (e.g., app name regex)
- Custom validators: isCommandAllowed (allowlist.ts), isValidAppName (apps.ts)

**Authentication:**
- Method: JWT with httpOnly cookies
- Implementation: server/lib/auth.ts (76 lines)
- Flow: Password check → JWT generation → Cookie → Token verification
- Middleware: authMiddleware for protected routes
- Rate limiting: authRateLimiter (5 attempts/15 min)
- Security: JWT secret from env, 24h expiry, httpOnly flag

---
*Architecture analysis: 2026-02-28*
