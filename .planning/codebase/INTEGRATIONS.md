# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**Dokku CLI:**
- Remote command execution via SSH
- SDK/Client: node-ssh 13.2.1
- Auth: `DOCKLIGHT_DOKKU_SSH_TARGET` (e.g., dokku@server-ip)
- Connection pooling with TTL cleanup
- Allowlist validation for security

**Dokku (Root):**
- Plugin management requires root SSH access
- SDK/Client: node-ssh 13.2.1
- Auth: `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` (optional)

## Data Storage

**Databases:**
- SQLite 3 (via better-sqlite3 12.6.2)
- Connection: File-based at `data/docklight.db` (default)
- Configurable via `DOCKLIGHT_DB_PATH`
- Client: better-sqlite3 (synchronous, prepared statements)

**File Storage:**
- Local filesystem only
- SSH key storage at `DOCKLIGHT_DOKKU_SSH_KEY_PATH`
- Database persists in container filesystem

**Caching:**
- In-memory cache with TTL (server/lib/cache.ts)
- 30-second default TTL
- No external cache service

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based implementation
- Hashing: scrypt (Node.js crypto)
- Token storage: HttpOnly cookies
- Session duration: 24 hours
- Role-based access control: user, admin, operator

## Monitoring & Observability

**Error Tracking:**
- None (log-based only)

**Logs:**
- Pino structured logging
- Log level via `LOG_LEVEL` env var (default: info)
- HTTP request logging via pino-http middleware
- Command execution audit trail in database

## CI/CD & Deployment

**Hosting:**
- Docker containerization
- Can be deployed to Dokku itself

**CI Pipeline:**
- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Runs typecheck, lint, and tests on push

## Environment Configuration

**Required env vars:**
- `JWT_SECRET` - JWT token signing secret
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH connection string (user@host)
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key

**Optional env vars:**
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Root SSH for plugin operations
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Additional SSH options
- `DOCKLIGHT_DB_PATH` - Custom SQLite database path
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
- `NODE_ENV` - Environment mode

**Secrets location:**
- Environment variables (not committed)
- Server `.env.example` provides template

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- None (no outgoing webhooks)

---

*Integration audit: 2026-03-02*
