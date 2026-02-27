# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services
**Dokku CLI (Primary Integration):**
- Dokku - PaaS platform management via shell commands (`child_process.exec`)
- SDK/Client: Direct CLI execution through `server/lib/executor.ts`
- Auth: Runs on same host as Dokku; relies on OS-level permissions (no API key)
- Commands used:
  - `dokku apps:list`, `dokku ps:report`, `dokku ps:restart`, `dokku ps:rebuild`, `dokku ps:scale`
  - `dokku config:show`, `dokku config:set`, `dokku config:unset`
  - `dokku domains:report`, `dokku domains:add`, `dokku domains:remove`
  - `dokku letsencrypt:enable`, `dokku letsencrypt:auto-renew`, `dokku letsencrypt:ls`
  - `dokku certs:report`
  - `dokku plugin:list`, `dokku {plugin}:list`, `dokku {plugin}:create`, `dokku {plugin}:link`
  - `dokku logs {app} -t` (streaming via WebSocket)
- Supported database plugins: postgres, redis, mysql, mariadb, mongo

**System Commands:**
- `grep /proc/stat` + `awk` - CPU usage monitoring
- `free -m` - Memory usage monitoring
- `df -h` - Disk usage monitoring
- Command allowlist: `dokku`, `top`, `free`, `df` (see `server/lib/allowlist.ts`)

## Data Storage
**Databases:**
- SQLite (embedded via better-sqlite3)
- Connection: Local file at `data/docklight.db` (relative to project root)
- Client: better-sqlite3 (synchronous, prepared statements)
- Schema: Single `command_history` table (id, command, exitCode, stdout, stderr, createdAt)
**File Storage:**
- Local filesystem only (SQLite DB file, static client assets)
**Caching:**
- None

## Authentication & Identity
**Auth Provider:**
- Custom password-based authentication
- Implementation:
  - Single shared password via `DOCKLIGHT_PASSWORD` env var
  - JWT tokens (jsonwebtoken) with 24h expiry
  - Stored in httpOnly, secure (in production), sameSite=strict cookies
  - Cookie name: `session`
  - JWT secret via `DOCKLIGHT_SECRET` env var (has hardcoded default — insecure)
  - WebSocket connections also authenticate via session cookie
  - No user accounts, roles, or OAuth — single-user admin model

## Monitoring & Observability
**Error Tracking:**
- None (no Sentry, Datadog, etc.)
**Logs:**
- console.log / console.error (stdout/stderr)
- Command execution history persisted to SQLite for audit trail
- Health check endpoint: `GET /api/health` (returns `{"status":"ok"}`)
- Server health endpoint: `GET /api/server/health` (CPU, memory, disk percentages)

## CI/CD & Deployment
**Hosting:**
- Self-hosted on a Dokku VPS (same server it manages)
- Docker multi-stage build (node:20-alpine)
- Procfile: `web: node server/dist/index.js`
- app.json healthcheck: `curl -f http://localhost:$PORT/api/health`
**CI Pipeline:**
- None configured (no GitHub Actions, no CI config files)

## Environment Configuration
**Required env vars:**
- `DOCKLIGHT_PASSWORD` - Login password (warned if missing)
- `DOCKLIGHT_SECRET` - JWT signing secret (has insecure default)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Set to "production" for secure cookies
**Secrets location:**
- Environment variables (no `.env` file, no vault, no secrets manager)

## Webhooks & Callbacks
**Incoming:**
- None (no webhook endpoints)
**Outgoing:**
- None (no outbound webhook calls)

---
*Integration audit: 2026-02-27*
