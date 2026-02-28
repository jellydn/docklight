# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Dokku CLI (via SSH):**
- Purpose: Core functionality - all app/database/plugin management
- Implementation: `server/lib/executor.ts` executes shell commands via SSH
- Auth: SSH key-based authentication
- Commands restricted to allowlist in `server/lib/allowlist.ts`

**Command Categories:**
- Apps: `apps:list`, `ps:report`, `ps:restart`, `ps:rebuild`, `ps:scale`
- Config: `config:show`, `config:set`, `config:unset`
- Domains: `domains:report`, `domains:add`, `domains:remove`
- Databases: `<plugin>:list`, `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy`
- Plugins: `plugin:list`, `plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`
- SSL: `letsencrypt:enable`, `letsencrypt:auto-renew`

## Data Storage

**Databases:**
- SQLite (better-sqlite3) - Local file-based database
- Connection: `server/lib/db.ts`
- Client: better-sqlite3 (synchronous API)
- Purpose: Store command execution history

**Schema:**
- `commands` table: id, command, exitCode, stdout, stderr, createdAt

**File Storage:**
- Local filesystem only (no S3, etc.)
- SQLite database file location: Configurable via DB path

**Caching:**
- None (no Redis, etc.)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
- Implementation: `server/lib/auth.ts`
- Storage: HTTP-only session cookie
- Secret: `DOCKLIGHT_SECRET` env var (auto-generated if not set)

**Flow:**
1. User submits password to `/api/auth/login`
2. Server verifies against `DOCKLIGHT_PASSWORD`
3. Server issues JWT token
4. Token stored in cookie
5. Subsequent requests validate token via middleware

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, etc.)

**Logs:**
- Pino structured logging (`server/lib/logger.ts`)
- HTTP requests logged via pino-http middleware
- Log level: Configurable (defaults to info)
- Output: stdout (can be configured for file/transport)

## CI/CD & Deployment

**Hosting:**
- Dokku (self-hosted PaaS)
- Docker containers

**CI Pipeline:**
- None visible (manual git push to Dokku remote)

**Deployment:**
```bash
git push dokku main
```

## Environment Configuration

**Required env vars:**
- `DOCKLIGHT_PASSWORD` - Admin password (required)

**Optional env vars:**
- `DOCKLIGHT_SECRET` - JWT signing secret (auto-generated if not set)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target for Dokku commands (recommended)
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Dedicated SSH target for root-required commands
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Additional SSH options
- `PORT` - Server port (default: 3001)

**Secrets location:**
- Environment variables only
- No secrets in code

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- None (no external webhooks)

**Real-time:**
- WebSocket server for live log streaming (`server/lib/websocket.ts`)
- Endpoint: `/api/apps/:name/logs/stream`

---

*Integration audit: 2026-02-28*
