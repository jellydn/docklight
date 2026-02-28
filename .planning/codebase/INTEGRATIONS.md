# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Dokku CLI:**
- What it's used for: Core functionality - manages Docker containers, apps, domains, SSL, databases
- SDK/Client: None (direct shell execution via SSH)
- Auth: SSH key-based authentication
- Location: Remote server accessed via `node-ssh`

**SSH Protocol:**
- What it's used for: Secure remote command execution on Dokku server
- SDK/Client: `node-ssh` 13.2.1
- Auth: `DOCKLIGHT_DOKKU_SSH_TARGET`, `DOCKLIGHT_DOKKU_SSH_KEY_PATH`
- Sudo support: Via `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` for privileged commands

## Data Storage

**Databases:**
- Type: SQLite (embedded)
- Connection: `server/lib/db.ts` using `better-sqlite3`
- Client: `better-sqlite3` 12.6.2 (synchronous API)
- Purpose: Audit logging for command history
- Location: `data/docklight.db` (generated, not committed)

**File Storage:**
- Service: Local filesystem only
- Location: `data/` directory for SQLite database

**Caching:**
- Service: In-memory (Map-based with TTL)
- Implementation: `server/lib/cache.ts`
- TTL: 30000ms (configurable via `CACHE_TTL` env var)
- Purpose: Reduce redundant Dokku commands

## Authentication & Identity

**Auth Provider:**
- Service: Custom JWT-based authentication
- Implementation:
  - Password-based login stored in `DOCKLIGHT_PASSWORD` env var
  - JWT tokens signed with `DOCKLIGHT_SECRET`
  - 24-hour token expiry
  - httpOnly cookies for token storage
  - Rate limiting: 5 attempts per 15-minute window

**Security:**
- Command allowlist in `server/lib/allowlist.ts`
- Input validation via Zod schemas
- Regex-based app name validation

## Monitoring & Observability

**Error Tracking:**
- Service: None (logs only)

**Logs:**
- Framework: Pino (structured JSON logging)
- Config: `server/lib/logger.ts`
- HTTP requests: Auto-logged via `pino-http` middleware
- Log levels: info, warn, error (configurable via `LOG_LEVEL`)
- Format: JSON in production, human-readable in development

## CI/CD & Deployment

**Hosting:**
- Platform: Dokku (self-hosted PaaS)
- Alternative: Heroku, Cloud66 (via `app.json`, `Procfile`)

**CI Pipeline:**
- Service: GitHub Actions
- Workflows:
  - `.github/workflows/ci.yml` - Typecheck, lint, test on push/PR
  - `.github/workflows/deploy-production.yml` - Production deployment
  - `.github/workflows/deploy-staging.yml` - Staging deployment

**Deployment Artifacts:**
- `Dockerfile` - Multi-stage Docker build
- `Procfile` - Process definitions for cloud platforms
- `app.json` - Heroku/Cloud66 configuration

## Environment Configuration

**Required env vars:**
- `DOCKLIGHT_SECRET` - JWT signing secret (REQUIRED - warning if missing)
- `DOCKLIGHT_PASSWORD` - Admin password (required for auth to work)

**Optional env vars:**
- `DOCKLIGHT_DOKKU_SSH_TARGET` - Default SSH user@host
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Root SSH target for sudo commands
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Additional SSH options
- `CACHE_TTL` - Cache TTL in milliseconds (default: 30000)
- `LOG_LEVEL` - Logging level (default: "info")
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment ("development" or "production")

**Secrets location:**
- Environment variables (no secret management service)
- httpOnly cookies for JWT tokens

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- None (no outgoing webhooks)

**Real-time:**
- WebSocket server at `/api/apps/:name/logs/stream` for log streaming
- Requires JWT authentication via cookie

---
*Integration audit: 2026-02-28*
