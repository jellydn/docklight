# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**Dokku CLI:**
- SSH-based command execution via `node-ssh`
- Custom command builder in `server/lib/dokku.ts`
- Command allowlist in `server/lib/allowlist.ts`
- Auth: SSH key authentication (`DOCKLIGHT_DOKKU_SSH_KEY_PATH`)

**No external API calls:**
- All functionality is self-contained
- No third-party SaaS dependencies
- No webhooks to external services

## Data Storage

**Databases:**
- SQLite (better-sqlite3)
- Connection: File-based (`DOCKLIGHT_DB_PATH`, default `data/docklight.db`)
- Client: better-sqlite3 with prepared statements
- Tables: users, audit_logs, settings

**File Storage:**
- Local filesystem only
- Command history stored in SQLite
- No cloud storage integration

**Caching:**
- In-memory simple cache implementation (`server/lib/cache.ts`)
- No Redis or external cache

## Authentication & Identity

**Auth Provider:**
- Custom implementation
- JWT-based session tokens (`jsonwebtoken`)
- Password hashing with scrypt (Node.js crypto)
- Role-based access control: admin, operator, viewer
- Cookie-based session storage (httpOnly, secure, sameSite=strict)

**User Management:**
- CLI user creation via `server/createUser.ts`
- SQLite user storage
- No external identity providers (OAuth, LDAP, etc.)

## Monitoring & Observability

**Error Tracking:**
- None (manual log review only)

**Logs:**
- Pino structured logging
- Log levels: fatal, error, warn, info, debug, trace
- Configurable via `LOG_LEVEL` env var
- Audit log rotation (`server/lib/audit-rotation.ts`)

## CI/CD & Deployment

**Hosting:**
- Self-hosted on Dokku
- Configured via `DOCKLIGHT_DOKKU_SSH_TARGET`

**CI Pipeline:**
- GitHub Actions workflows in `.github/workflows/`
- See `.github/workflows/` directory for details

## Environment Configuration

**Required env vars:**
- `JWT_SECRET` - JWT signing secret (required in production)

**Optional env vars:**
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target for remote Dokku
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Additional SSH options
- `PORT` - Server port (default 3001)
- `LOG_LEVEL` - Logging level (default info)
- `DOCKLIGHT_DB_PATH` - SQLite database path
- Rate limiting: `DOCKLIGHT_RATE_LIMIT_WINDOW_MS`, `DOCKLIGHT_AUTH_MAX_REQUESTS`, etc.

**Secrets location:**
- Environment variables only
- No secrets in code or config files

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-03-11*
