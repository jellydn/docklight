# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**Dokku CLI:**

- Remote command execution via SSH - Core functionality for managing Dokku apps
- Client: Custom node-ssh wrapper in `/server/lib/executor.ts`
- Auth: SSH key-based authentication
- Target: Configured via `DOCKLIGHT_DOKKU_SSH_TARGET` env var (format: `user@host`)

**GitHub Actions:**

- CI/CD pipeline automation
- Workflows: `/Users/huynhdung/src/tries/2026-03-01-jellydn-docklight-pr47/.github/workflows/`
  - `ci.yml` - Typecheck, lint, and test on push/PR
  - `deploy-production.yml` - Deploy to production on main branch push
  - `deploy-staging.yml` - Deploy staging on PR open/synchronize/reopen
- Auth: `DOKKU_SSH_KEY` and `DOKKU_HOST` secrets

## Data Storage

**Databases:**

- SQLite (better-sqlite3 12.6.2) - Embedded database for local storage
- Connection: Local file at `/server/data/docklight.db`
- Client: Direct SQL with prepared statements (no ORM)
- Schema: Auto-created on startup in `/server/lib/db.ts`
  - `command_history` - Command execution audit log
  - `users` - User accounts with RBAC roles (admin/operator/viewer)
  - `audit_log` - User action auditing

**File Storage:**

- Local filesystem only
- Database stored in `/server/data/` directory
- SSH keys read from filesystem path

**Caching:**

- In-memory Map-based cache with TTL support
- Implementation: `/server/lib/cache.ts`
- Configurable via `CACHE_TTL` environment variable (default: 30000ms)
- Used for caching Dokku command responses

## Authentication & Identity

**Auth Provider:**

- Custom JWT-based authentication
- Implementation: `/server/lib/auth.ts`
- JWT secret: `JWT_SECRET` or `DOCKLIGHT_SECRET` env var (required in production)
- Role-Based Access Control (RBAC): admin, operator, viewer roles

**Session Management:**

- JWT tokens stored in HTTP-only cookies
- Cookie name: `docklight_token`
- Secure cookies enabled in production

## Monitoring & Observability

**Error Tracking:**

- Structured logging only (no external error tracking service)
- All errors logged via Pino logger

**Logs:**

- Pino structured logging (`/server/lib/logger.ts`)
- HTTP request logging via pino-http middleware
- Log level: Configurable via `LOG_LEVEL` env var (default: "info")
- Pretty-print enabled in non-production

## CI/CD & Deployment

**Hosting:**

- Self-hosted on Dokku server
- Production: `https://docklight.itman.fyi`
- Staging: `https://docklight-staging.itman.fyi`
- Deployment method: Git push to Dokku remote

**CI Pipeline:**

- GitHub Actions (see APIs & External Services above)
- Three jobs: typecheck, lint, test
- Runs on Ubuntu latest with Bun runtime

## Environment Configuration

**Required env vars:**

- `JWT_SECRET` or `DOCKLIGHT_SECRET` - JWT signing secret (required in production)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target for Dokku commands (format: `dokku@host`)
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Optional root user SSH target
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Optional SSH connection options
- `CACHE_TTL` - Cache TTL in milliseconds (optional, default: 30000)
- `LOG_LEVEL` - Pino log level (optional, default: "info")
- `NODE_ENV` - Environment mode (development/production/test)
- `PORT` - Server port (optional, default: 3001)

**Secrets location:**

- GitHub Secrets for CI/CD (`DOKKU_SSH_KEY`, `DOKKU_HOST`)
- Environment variables for runtime configuration
- SSH keys stored on server filesystem

## Webhooks & Callbacks

**Incoming:**

- None (no inbound webhook endpoints)

**Outgoing:**

- GitHub PR comments via actions/github-script@v8 (staging deployments only)
- Comments deployment URL on pull requests

## Security Features

**Command Execution:**

- Allowlist-based command validation (`/server/lib/allowlist.ts`)
- SSH connection pooling with 5-minute idle timeout
- Prepared SQL statements to prevent injection
- Rate limiting on API endpoints
- Command audit logging to SQLite

**Network:**

- Vite dev proxy: `/api` -> `http://localhost:3001`
- WebSocket support via ws 8.19.0
- CORS handling for API endpoints

---

_Integration audit: 2026-03-01_
