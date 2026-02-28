# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Dokku CLI:**
- Primary integration for app deployment management
- CLI commands executed via shell (allowlist enforced)
- SDK/Client: Direct shell execution via `server/lib/executor.ts`
- Auth: Server must have SSH/sudo access to Dokku

**System Monitoring:**
- System resource commands: `top`, `free`, `df`
- Used for server health monitoring
- Executed through same allowlisted command pattern

## Data Storage

**Databases:**
- better-sqlite3 (embedded SQLite)
- Connection: Local file-based (`server/data/commands.db`)
- Client: Synchronous API with prepared statements
- Purpose: Store recent command history (cache)

**File Storage:**
- Local filesystem only
- No external file storage services

**Caching:**
- In-memory LRU cache (server/lib/cache.ts)
- Time-based TTL for expensive operations (app lists, database lists)

## Authentication & Identity

**Auth Provider:**
- Custom password-based authentication
- Implementation: Cookie-based sessions with httpOnly
- JWT tokens stored in secure cookies
- Rate limiting on login endpoint (express-rate-limit)

## Monitoring & Observability

**Error Tracking:**
- None (local logging only)

**Logs:**
- Pino structured logging (JSON format)
- HTTP requests logged via pino-http middleware
- Real-time log streaming via WebSocket (`server/lib/websocket.ts`)

## CI/CD & Deployment

**Hosting:**
- GitHub Actions for CI/CD
- Staging deployment via `.github/workflows/deploy-staging.yml`

**CI Pipeline:**
- `.github/workflows/ci.yml` - Typecheck, lint, and test on push/PR to main
- Uses oven-sh/setup-bun@v2
- Runs typecheck, lint, and test for both server and client in parallel

## Environment Configuration

**Required env vars:**
- `PORT` - Server port (default: 3001)
- `DOKKU_PASSWORD` - Authentication password for web UI

**Secrets location:**
- Environment variables (not committed to git)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-02-28*
