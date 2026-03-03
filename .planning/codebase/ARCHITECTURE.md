# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Client-Server with SSH Command Execution

**Key Characteristics:**
- Single-page React application communicating via REST API
- Express.js server that proxies commands to Dokku CLI over SSH
- SQLite database for user authentication and audit logging
- WebSocket connections for real-time log streaming
- Modular route organization by feature domain

## Layers

**Presentation Layer (Client):**
- Purpose: React SPA providing web UI for Dokku management
- Location: `client/src/`
- Contains: React components, pages, contexts, hooks
- Depends on: Express API server (via `/api` proxy)
- Used by: End users in web browsers

**API Layer (Server):**
- Purpose: HTTP REST API handling authentication and routing
- Location: `server/routes/` and `server/index.ts`
- Contains: Express route handlers, middleware, auth
- Depends on: Business logic layer (`server/lib/`)
- Used by: React frontend

**Business Logic Layer:**
- Purpose: Core application logic and Dokku command execution
- Location: `server/lib/`
- Contains: Command executors, data transformations, SSH pooling
- Depends on: Dokku CLI (via SSH), SQLite database
- Used by: API routes

**Infrastructure Layer:**
- Purpose: SSH connections and process execution
- Location: `server/lib/executor.ts`, `server/lib/websocket.ts`
- Contains: SSH pool management, WebSocket handling
- Depends on: Remote Dokku server
- Used by: Business logic layer

## Data Flow

**Request Flow:**
1. Browser makes HTTP request to `/api/*` endpoint
2. Vite dev server proxies to Express (port 3001)
3. Express middleware validates JWT authentication
4. Route handler calls business logic function
5. Business logic executes Dokku command via SSH
6. Response transformed and returned as JSON
7. Client receives and updates React state

**WebSocket Flow:**
1. Client opens WebSocket connection to `/api/logs`
2. Server authenticates via token query parameter
3. SSH connection established to Dokku server
4. Log lines streamed in real-time to client
5. Connection closed when client disconnects

**Authentication Flow:**
1. User posts credentials to `/api/auth/login`
2. Server verifies against SQLite users table
3. JWT generated with user ID and role
4. Token stored in HTTP-only cookie
5. Subsequent requests validate JWT via middleware

**State Management:**
- Server stateless (JWT-based auth, SSH connection pooling)
- Client uses React Context for auth state
- Local component state for UI interactions
- Server-side SQLite for persistent data

## Key Abstractions

**CommandExecutor:**
- Purpose: Abstract SSH command execution with connection pooling
- Examples: `server/lib/executor.ts`
- Pattern: Singleton pool with lazy connection initialization

**DokkuCommands:**
- Purpose: Generate Dokku CLI command strings
- Examples: `server/lib/dokku.ts`
- Pattern: Static methods returning command arrays

**Route Registration:**
- Purpose: Modular Express route setup
- Examples: `server/routes/*.ts`
- Pattern: `register*Routes(app)` functions

**React Context Providers:**
- Purpose: Global state for authentication
- Examples: `client/src/contexts/auth-context.tsx`
- Pattern: Context + Custom Hook pattern

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: Node process startup
- Responsibilities: Express app setup, route registration, WebSocket initialization, graceful shutdown

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads the app
- Responsibilities: React root rendering, BrowserRouter setup

**Vite Dev Server:**
- Location: `client/vite.config.ts`
- Triggers: `bun run client-dev`
- Responsibilities: HMR, API proxy to `localhost:3001`

**Docker Entry:**
- Location: `server/index.ts` (same as server)
- Triggers: Container startup
- Responsibilities: Production server with static file serving

## Error Handling

**Strategy:** Return typed error objects, never throw for expected failures

**Patterns:**
- Command execution returns `{ exitCode, stdout, stderr, command }`
- Validation errors return `{ error, exitCode: 400 }`
- Try-catch for unexpected errors, typed with `error as { message?: string }`
- Client displays error messages from API responses

## Cross-Cutting Concerns

**Logging:** Pino structured logging with request context via pinoHttp

**Validation:** Zod schemas on client, runtime checks on server

**Authentication:** JWT-based auth with HTTP-only cookies, RBAC with admin role

**Rate Limiting:** Express-rate-limit per user and per command execution

**Security:** Command allowlist enforcement, SSH target validation, HTTPS redirect in production

---

*Architecture analysis: 2026-03-04*
