# Codebase Concerns

**Analysis Date:** 2026-02-27
**Last Updated:** 2026-02-27

## Tech Debt

**~~Pervasive `any` types across server:~~** ✅ FIXED
- All `catch (error: any)` replaced with `error: unknown` + type narrowing
- `authMiddleware` typed with `Request, Response, NextFunction`
- `websocket.ts` typed with `http.Server`, `http.IncomingMessage`, `net.Socket`, `ChildProcess`

**~~SPA fallback catch-all registered before API routes:~~** ✅ FIXED
- Moved `app.get("*")` to after all API route definitions

**Inconsistent error return types:**
- Issue: Functions return `Result | { error, exitCode, ... }` union types with different shapes. Some include `command`/`stderr`, others don't. No shared error type
- Files: `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/databases.ts`, `server/lib/domains.ts`, `server/lib/ssl.ts`
- Impact: Client must handle multiple error shapes; easy to miss error cases
- Fix approach: Define a shared `ApiError` type and use discriminated unions consistently

**~~`require()` mixed with ESM imports:~~** ✅ FIXED
- `require("http")` → `import http from "http"` in `server/index.ts`
- `require("child_process")` → `import { spawn } from "child_process"` in `server/lib/websocket.ts`

**~~Duplicate ESLint + Biome linting in client:~~** ✅ FIXED
- Removed ESLint deps, `eslint.config.js`, and `lint:eslint` script from `client/package.json`

## Known Bugs

**~~GET API routes unreachable due to route ordering:~~** ✅ FIXED
- SPA catch-all moved to end of route definitions

**~~Database link/unlink/destroy uses `name` as plugin prefix:~~** ✅ FIXED
- Added `plugin` parameter to `linkDatabase`, `unlinkDatabase`, `destroyDatabase`
- Commands now correctly use `dokku postgres:link mydb myapp` format
- API routes and client updated to pass `plugin` in request body

**Log streaming ignores line count changes after connection:**
- Symptoms: WebSocket receives `lines` message but the `dokku logs` process is already spawned with the initial count. Changing `lineCount` requires reconnection
- Files: `server/lib/websocket.ts:73-81,86`
- Trigger: Changing line count dropdown while logs are streaming
- Workaround: Client does reconnect via `useEffect` dependency on `lineCount` (`client/src/pages/AppDetail.tsx:88`), but the server-side message handler is dead code

## Security Considerations

**Hardcoded default JWT secret:** ⚠️ PARTIALLY FIXED
- Risk: Default secret `"docklight-default-secret-change-in-production"` is used when `DOCKLIGHT_SECRET` is unset
- Files: `server/lib/auth.ts:4`
- Current mitigation: Console warning now logged when `DOCKLIGHT_SECRET` is unset
- Remaining: Consider refusing to start without `DOCKLIGHT_SECRET` in production; or generate a random secret at first run

**No rate limiting on login endpoint:**
- Risk: Brute-force password attacks; no throttling or lockout mechanism
- Files: `server/index.ts:35-43`
- Current mitigation: None
- Recommendations: Add rate limiting (e.g., `express-rate-limit`) on `/api/auth/login`

**No CORS, Helmet, or CSP headers:**
- Risk: Missing security headers leave app vulnerable to clickjacking, XSS, MIME sniffing attacks
- Files: `server/index.ts`
- Current mitigation: `sameSite: "strict"` on cookies
- Recommendations: Add `helmet` middleware; configure CORS if needed; set CSP headers

**~~Allowlist is dead code — never enforced:~~** ✅ FIXED
- Removed unused `isCommandAllowed` import from `server/index.ts`
- `allowlist.ts` module still exists but is unused; consider removing entirely or enforcing in `executeCommand()`

**Command history stores all stdout/stderr:**
- Risk: Sensitive data (database credentials, env vars from `config:show`) is stored in plaintext in SQLite
- Files: `server/lib/db.ts:36-40`, `server/lib/executor.ts:26`
- Current mitigation: None
- Recommendations: Redact sensitive output before saving; or don't store stdout for `config:show` commands

## Performance Bottlenecks

**~~Sequential command execution for app listing (N+1 problem):~~** ✅ FIXED
- `getApps()` now uses `Promise.all()` to parallelize per-app `ps:report` and `domains:report` queries

**~~Sequential database enumeration:~~** ✅ FIXED
- `getDatabases()` now uses nested `Promise.all()` to parallelize plugin listing and per-db link queries

**Dashboard makes 3 parallel API calls but each triggers multiple shell commands:**
- Problem: Dashboard fetches health + apps + commands simultaneously. Health alone runs 3 shell commands; apps runs 1 + 2N commands
- Files: `client/src/pages/Dashboard.tsx:36-39`, `server/lib/server.ts`, `server/lib/apps.ts`
- Cause: No caching layer; every page load re-executes all commands
- Improvement path: Add server-side caching with short TTL (5-10s) for health/app data

**~~Unbounded log accumulation in client memory:~~** ✅ FIXED
- Log buffer capped at 10,000 lines with FIFO eviction in `AppDetail.tsx`

## Fragile Areas

**AppDetail.tsx — 1005-line monolith component:**
- Files: `client/src/pages/AppDetail.tsx`
- Why fragile: 50+ state variables, 5 tabs (overview, config, domains, logs, ssl), all in one component with interleaved state management
- Safe modification: Extract each tab into its own component; extract custom hooks for data fetching (useAppConfig, useDomains, useSSL, useLogs)
- Test coverage: Zero — no tests exist anywhere in the project

**Dokku output parsing with regex:**
- Files: `server/lib/apps.ts`, `server/lib/ssl.ts`, `server/lib/databases.ts`, `server/lib/config.ts`
- Why fragile: Parsing relies on exact Dokku output format; any Dokku version upgrade could change output formatting
- Safe modification: Pin Dokku version; add integration tests with sample outputs; consider using `--format json` where available
- Test coverage: None — all parsing logic is untested

**WebSocket log streaming:**
- Files: `server/lib/websocket.ts`
- Why fragile: Manual cookie parsing, manual URL regex matching, raw process spawning, no reconnection logic on server side
- Safe modification: Use a cookie-parsing library; add health checks; handle process spawn failures gracefully
- Test coverage: None

## Scaling Limits

**SQLite command history:**
- Current capacity: Single-writer, all commands logged
- Limit: No cleanup/rotation — database grows indefinitely. High command frequency can cause WAL contention
- Scaling path: Add TTL-based cleanup (delete entries older than N days); add index on `createdAt`; consider `maxEntries` cap

**Single-process Express server:**
- Current capacity: Single Node.js process handling all requests + WebSocket connections
- Limit: Cannot utilize multiple CPU cores; long-running commands (rebuild) block the event loop timeout
- Scaling path: Use `cluster` module or PM2 for multi-process; move long commands to a job queue

**30-second command timeout:**
- Current capacity: `executeCommand` has 30s default timeout
- Limit: `dokku ps:rebuild` and `letsencrypt:enable` can take minutes
- Scaling path: Increase timeout for specific operations; use WebSocket streaming for long operations

## Dependencies at Risk

**Express 4.x:**
- Risk: Express 5 has been in development; v4 is aging but stable
- Impact: Low immediate risk; eventual migration needed
- Migration plan: Monitor Express 5 stable release; update when ready

**~~Duplicate linting toolchain (ESLint + Biome):~~** ✅ FIXED
- ESLint and related packages removed from `client/package.json`

## Missing Critical Features

**No HTTPS/TLS termination:**
- Problem: Server listens on plain HTTP; relies on reverse proxy (Dokku/nginx) for TLS
- Blocks: Direct deployment without a reverse proxy is insecure

**No database migration system:**
- Problem: Schema is created inline with `CREATE TABLE IF NOT EXISTS`. No versioned migrations
- Blocks: Schema changes require manual intervention; no rollback capability

**No app creation/deletion via UI:**
- Problem: Can manage existing apps but cannot create new ones or destroy them
- Blocks: Full lifecycle management requires SSH access

**No user management:**
- Problem: Single shared password for all users; no audit trail per user
- Blocks: Multi-user deployments; accountability for actions

## Test Coverage Gaps

**Entire server has zero tests:**
- What's not tested: All server modules — executor, auth, apps, config, databases, domains, ssl, websocket, allowlist, db
- Files: `server/lib/*.ts`, `server/index.ts`
- Risk: Parsing regressions go undetected
- Priority: **Critical**

**Entire client has zero tests:**
- What's not tested: All React components, API client, routing, WebSocket handling
- Files: `client/src/**/*.tsx`, `client/src/lib/api.ts`
- Risk: UI regressions, broken auth flows, WebSocket disconnection handling
- Priority: **High** — especially for AppDetail.tsx (1005 lines of complex state)

**No integration/E2E tests:**
- What's not tested: Full request flow from client → server → dokku CLI
- Files: N/A — no test infrastructure exists
- Risk: Cannot verify deployment, scaling, or database operations without manual testing
- Priority: **High** — at minimum, API route tests with mocked executor

**Dokku output parsing completely untested:**
- What's not tested: All regex-based parsing of `ps:report`, `domains:report`, `config:show`, `letsencrypt:ls`, `plugin:list` output
- Files: `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`
- Risk: Any Dokku version change silently breaks data extraction
- Priority: **High** — easy to test with fixture data

---
*Concerns audit: 2026-02-27 | Updated: 2026-02-27*
