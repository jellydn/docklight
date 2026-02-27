# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**PaaS/Infrastructure (Dokku):**
- Dokku CLI - Core integration for app lifecycle, config, domains, databases, SSL, and logs (`dokku ...` commands in `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/websocket.ts`)
- SDK/Client: Shell command execution via Node `child_process.exec`/`spawn` (`server/lib/executor.ts`, `server/lib/websocket.ts`)
- Auth: Session cookie JWT validated by backend middleware for API/WebSocket access (`server/lib/auth.ts`, `server/lib/websocket.ts`)

## Data Storage

**Databases:**
- SQLite (local file, via better-sqlite3) for command history (`server/lib/db.ts`, `server/package.json`)
- Connection: Local filesystem path `data/docklight.db` (`server/lib/db.ts`)
- Client: `better-sqlite3` direct driver (`server/lib/db.ts`)

**File Storage:**
- Local filesystem only (`/app/data` in container and `data/` in repo) (`Dockerfile`, `server/lib/db.ts`)

**Caching:**
- None (no cache layer/service configured in `server/package.json` or `client/package.json`)

## Authentication & Identity

**Auth Provider:**
- Custom (no external IdP/OAuth provider)
- Implementation: Password check from env var + JWT session cookie + Express middleware (`server/lib/auth.ts`, `server/index.ts`)

## Monitoring & Observability

**Error Tracking:**
- None (no external Sentry/Datadog/Bugsnag-style SDK present in `server/package.json` or `client/package.json`)

**Logs:**
- Structured logs with Pino/Pino HTTP on backend and browser-side Pino logger (`server/lib/logger.ts`, `server/index.ts`, `client/src/lib/logger.ts`)
- Command execution audit persisted in SQLite `command_history` (`server/lib/db.ts`, `server/lib/executor.ts`)

## CI/CD & Deployment

**Hosting:**
- Dokku (single-node/self-hosted target) with Docker-based deploy (`README.md`, `docs/deployment.md`, `Dockerfile`)

**CI Pipeline:**
- None (repository includes local task runner `justfile` and Renovate config `renovate.json`, but no CI workflow config files)

## Environment Configuration

**Required env vars:**
- `DOCKLIGHT_PASSWORD` (required login password) (`server/lib/auth.ts`, `README.md`)
- `DOCKLIGHT_SECRET` (JWT signing secret; strongly recommended) (`server/lib/auth.ts`, `README.md`)
- `PORT` (server listen port) (`server/index.ts`, `README.md`)
- `NODE_ENV`, `LOG_LEVEL` (runtime behavior/logging) (`server/lib/auth.ts`, `server/lib/logger.ts`)

**Secrets location:**
- Process environment variables, typically managed via Dokku config (`docs/deployment.md`, `README.md`)

## Webhooks & Callbacks

**Incoming:**
- None (no webhook receiver endpoints; exposed endpoints are UI/API routes and WebSocket stream in `server/index.ts` and `server/lib/websocket.ts`)

**Outgoing:**
- None (no outbound webhook/event callbacks over HTTP found; outbound integration is local Dokku/system shell execution in `server/lib/executor.ts` and `server/lib/server.ts`)

---

*Integration audit: 2026-02-27*
