# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**No external APIs directly integrated** - All integrations are local system interactions.

## Data Storage

**Databases:**
- **SQLite (better-sqlite3)** - Local file-based database
  - Connection: `DOCKLIGHT_DB_PATH` environment variable (default: `data/docklight.db`)
  - Client: `better-sqlite3` with synchronous API
  - Purpose: Command history audit trail, user management, audit logs
  - Tables: `command_history`, `users`, `audit_log`
  - Uses prepared statements for SQL injection prevention

**File Storage:**
- **Local filesystem only**
  - SSH private key storage for Dokku connections
  - SQLite database file (`data/docklight.db`)
  - No cloud storage integration

**Caching:**
- **In-memory cache** - Custom implementation in `server/lib/cache.ts`
  - No external caching service
  - TTL-based expiration (configurable via `CACHE_TTL`)
  - Uses Map for storage
  - Methods: `get`, `set`, `del`, `clear`, `clearPrefix`, `getStats`

## Authentication & Identity

**Auth Provider:**
- **Custom implementation** (not external provider)
  - Implementation: JWT-based session management
  - Libraries: `jsonwebtoken` (signing/verification)
  - Password hashing: Native `crypto` module (scrypt with 64-byte keys)
  - Token storage: HTTP-only cookies (`session` cookie)
  - Token expiration: 24 hours
  - Cookie options: Secure (production only), SameSite=strict
  - Role-based access: admin, operator, viewer

## Monitoring & Observability

**Error Tracking:**
- **None** - No external error tracking service (Sentry, etc.)

**Logs:**
- **Pino** - Structured logging framework
  - Server logging via `server/lib/logger.ts`
  - HTTP request logging via `pino-http` middleware
  - Log level controlled by `LOG_LEVEL` environment variable (default: "info")
  - Development mode: writes to stdout via pino/file transport
  - Production mode: standard output (streaming)
  - Structured JSON logs with context

## CI/CD & Deployment

**Hosting:**
- **Docker** - Multi-stage container build
  - Dockerfile: Three-stage build (client build → server build → runtime)
  - Base image: node:24-alpine
  - Dependencies: openssh-client for SSH connections
  - Exposed port: 3001 (or PORT env var)
  - Command: `node server/dist/index.js`

**CI Pipeline:**
- **GitHub Actions** - CI/CD automation
  - `.github/workflows/ci.yaml` - Typecheck, lint, test on push/PR
  - `.github/workflows/deploy-production.yaml` - Deploy to Dokku via SSH
  - Bun setup, test execution, deployment automation

## Environment Configuration

**Required env vars:**
- `JWT_SECRET` - JWT signing secret (required in production)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target for Dokku commands (e.g., `dokku@server-ip`)

**Optional env vars:**
- `LOG_LEVEL` - Logging level (default: "info")
- `NODE_ENV` - Environment (development/production)
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - SSH private key path
- `DOCKLIGHT_DOKKU_SSH_OPTS` - SSH options
- `DOCKLIGHT_DB_PATH` - SQLite database path
- `PORT` - Server port (default: 3001)
- `CACHE_TTL` - Cache TTL in milliseconds (default: 30000)
- `WS_MAX_CONNECTIONS` - Maximum WebSocket connections (default: 50)
- `WS_MAX_CONNECTIONS_PER_USER` - Per-user WebSocket limit (default: 5)
- `WS_IDLE_TIMEOUT_MS` - WebSocket idle timeout (default: 30 minutes)

**Secrets location:**
- Environment variables (not stored in files)
- SSH private key path (configured via environment variable)
- JWT secret (configured via environment variable)

## Webhooks & Callbacks

**Incoming:**
- **None** - No webhook endpoints configured

**Outgoing:**
- **None** - No webhook integrations configured

---

*Integration audit: 2026-03-02*
