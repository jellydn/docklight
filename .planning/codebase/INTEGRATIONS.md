# External Integrations

**Analysis Date:** 2026-03-07

## APIs & External Services

**SSH Remote Execution:**
- Dokku CLI - Remote command execution via SSH
- SDK/Client: `node-ssh` 13.2.1
- Auth: SSH key-based authentication
- Config: `DOCKLIGHT_DOKKU_SSH_TARGET`, `DOCKLIGHT_DOKKU_SSH_KEY_PATH`

**Git Repository Sync:**
- Remote Git repositories - HTTPS and SSH protocols
- Used for: `git:sync` app deployment feature
- Implementation: Custom validation in `server/lib/git.ts`

## Data Storage

**Databases:**
- SQLite (better-sqlite3 12.6.2) - Embedded database
- Connection: File-based at `DOCKLIGHT_DB_PATH` (default: "data/docklight.db")
- Client: better-sqlite3 with prepared statements
- Tables: commands (audit log), settings (server configuration)

**File Storage:**
- Local filesystem only - No external object storage
- SQLite database files stored locally

**Caching:**
- In-memory Map-based cache in `server/lib/cache.ts`
- SSH connection pool maintained by `node-ssh`

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
- Implementation: JWT stored in HTTP-only cookies
- Secret: `JWT_SECRET` environment variable (required)
- Middleware: `server/lib/auth.ts` - `authMiddleware()`
- Routes: `server/routes/auth.ts` - login/logout endpoints

## Monitoring & Observability

**Error Tracking:**
- None - Manual error logging via Pino

**Logs:**
- Pino 10.3.1 - Structured logging with JSON output
- HTTP requests logged via pino-http middleware
- Log levels configurable via `LOG_LEVEL` env var
- WebSocket-based live log streaming for app container logs

## CI/CD & Deployment

**Hosting:**
- Platform: Dokku (self-hosted PaaS)
- Deployment: Git push to Dokku remote

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`) - Basic CI
- No external CI service configured

## Environment Configuration

**Required env vars:**
- `JWT_SECRET` - JWT signing secret (required for auth)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH connection target (e.g., "dokku@server-ip")
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key for Dokku access

**Optional env vars:**
- `DOCKLIGHT_DB_PATH` - SQLite database path (default: "data/docklight.db")
- `LOG_LEVEL` - Pino log level (default: "info")
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3001)

**Secrets location:**
- Environment variables only
- No secrets manager integration

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints

**Outgoing:**
- None - No external webhook calls

## Real-time Communication

**WebSocket Server:**
- `ws` 8.19.0 - Live log streaming from app containers
- Implementation: `server/lib/websocket.ts`
- Client: Custom WebSocket connection in `client/src/hooks/use-streaming-action.ts`

**Server-Sent Events (SSE):**
- `server/lib/sse.ts` - SSE writer for streaming command output
- Used for: Long-running command execution with real-time progress

---

*Integration audit: 2026-03-07*
