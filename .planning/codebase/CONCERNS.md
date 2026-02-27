# Codebase Concerns

**Analysis Date:** 2026-02-27

## Tech Debt

**Command execution and validation are split across many modules:**
- Issue: Validation/sanitization rules are implemented ad hoc in each feature module while execution policy is centralized separately, causing inconsistent protections and duplicated parsing logic.
- Files: `server/lib/executor.ts`, `server/lib/allowlist.ts`, `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`
- Impact: Security checks are uneven and easy to bypass when one path misses a character/class.
- Fix approach: Move to a single command builder + argument escaping layer and execute with `spawn` args (no shell string interpolation).

**HTTP API error semantics are inconsistent:**
- Issue: Many backend operations return error payloads with HTTP 200 instead of status-aligned 4xx/5xx responses.
- Files: `server/index.ts`, `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `client/src/lib/api.ts`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Databases.tsx`
- Impact: Frontend can treat failed backend operations as successful data fetches and show misleading empty states.
- Fix approach: Standardize API response contracts and set proper HTTP status codes for operational failures.

**Operational parsing depends on CLI text output:**
- Issue: Core state is parsed from brittle string matching against Dokku CLI human-readable output.
- Files: `server/lib/apps.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/server.ts`
- Impact: Dokku output format changes can silently break parsing and UI behavior.
- Fix approach: Prefer machine-readable output where available or isolate robust parsers with regression tests.

## Known Bugs

**Unauthenticated login possible when password env var is missing:**
- Symptoms: Login can succeed with an empty/missing password field when `DOCKLIGHT_PASSWORD` is not set.
- Files: `server/lib/auth.ts`, `server/index.ts`
- Trigger: Start server without `DOCKLIGHT_PASSWORD`, then POST `/api/auth/login` with `{}`.
- Workaround: Always set `DOCKLIGHT_PASSWORD` in all environments.

**Scale action applies only one changed process type:**
- Symptoms: When multiple process scales are edited, only the first entry is sent to backend.
- Files: `client/src/pages/AppDetail.tsx`
- Trigger: Change scale for more than one process type, then click "Apply Scaling".
- Workaround: Apply scaling one process type at a time.

## Security Considerations

**Shell command injection risk in config value handling:**
- Risk: `config:set` interpolates user value into a shell command string wrapped in single quotes while not blocking single quotes/`&`, enabling command chaining in some payloads.
- Files: `server/lib/config.ts`, `server/lib/executor.ts`, `server/lib/allowlist.ts`
- Current mitigation: Partial character blacklist and allowlist on command prefixes.
- Recommendations: Stop using `exec` with shell strings; use `spawn` with argv, strict allowlist by full command shape, and reject unsafe characters including `'`, `&`, newlines.

**Weak/default auth secret and no login throttling:**
- Risk: Predictable default JWT secret and no brute-force protection on login endpoint.
- Files: `server/lib/auth.ts`, `server/index.ts`
- Current mitigation: Warning logs and `httpOnly`/`sameSite=strict` cookie flags.
- Recommendations: Fail fast on missing secret in production, require strong secret/password at startup, add rate limiting/lockout for `/api/auth/login`.

## Performance Bottlenecks

**N+1 command execution for database view:**
- Problem: Database listing runs plugin discovery, per-plugin list, then per-database link queries.
- Files: `server/lib/databases.ts`
- Cause: Nested async calls per plugin and per database without caching.
- Improvement path: Cache plugin availability and batch/limit detail fetches; add pagination for large fleets.

**Dashboard refresh does repeated expensive shell calls:**
- Problem: Every refresh triggers health checks plus app/command queries, and app listing itself triggers multiple Dokku commands per app.
- Files: `client/src/pages/Dashboard.tsx`, `server/lib/server.ts`, `server/lib/apps.ts`
- Cause: Polling every 30s with no server-side caching or incremental updates.
- Improvement path: Add short-lived server cache and incremental/push updates where possible.

## Fragile Areas

**WebSocket log streaming lifecycle and protocol assumptions:**
- Files: `server/lib/websocket.ts`, `client/src/pages/AppDetail.tsx`
- Why fragile: Custom cookie parsing, strict path regex handling, and reconnect/state behavior are hand-rolled.
- Safe modification: Change protocol handling with integration tests that cover auth failure, reconnect, and app name edge cases.
- Test coverage: No dedicated websocket tests found in `server/` or `client/`.

**Dokku response parsing in app/config/domain/ssl flows:**
- Files: `server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/ssl.ts`
- Why fragile: Business behavior depends on matching specific output phrases.
- Safe modification: Wrap parsers in small pure functions and validate them with fixture-based tests before altering regexes.
- Test coverage: No parser tests found in `server/`.

## Scaling Limits

**Command history storage:**
- Current capacity: SQLite table `command_history` has no retention policy and stores full stdout/stderr per command.
- Limit: Unbounded growth increases disk usage and query cost over time.
- Scaling path: Add retention/TTL, truncation/compression for large outputs, and archive strategy.

**Single-process backend execution model:**
- Current capacity: One Node process handles API, shell execution orchestration, and websocket log streaming.
- Limit: Under high concurrent operations/log streams, event-loop contention and process spawning overhead can degrade responsiveness.
- Scaling path: Introduce background job queue and isolate long-running operations from request path.

## Dependencies at Risk

**Non-reproducible container dependency installs:**
- Risk: Docker builds use `npm install` with `package*.json` and no committed npm lockfiles, while repo lockfiles are Bun lockfiles.
- Impact: Dependency drift across builds can cause unexpected runtime/build breakage.
- Migration plan: Use deterministic installs (`npm ci` + `package-lock.json`) or standardize container builds on Bun with `bun.lock`.

## Missing Critical Features

**No automated test suite for app server/client paths:**
- Problem: There are no tests in `server/` or `client/` validating command construction, parsing, auth edge cases, or UI flows.
- Blocks: Safe refactoring and confident releases for security-sensitive command execution paths.

**No startup hard-fail for insecure auth configuration:**
- Problem: Server logs warnings for missing `DOCKLIGHT_PASSWORD`/`DOCKLIGHT_SECRET` but continues running.
- Blocks: Reliable secure-by-default deployments.

## Test Coverage Gaps

**Backend security and command execution paths untested:**
- What's not tested: Login edge cases, command allowlist bypass attempts, config/domain/database input validation, command failure handling.
- Files: `server/lib/auth.ts`, `server/lib/executor.ts`, `server/lib/allowlist.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`
- Risk: Security regressions or command execution bugs can ship unnoticed.
- Priority: High

**Frontend critical workflows untested:**
- What's not tested: Multi-process scaling UX behavior, websocket log lifecycle, error-state rendering when backend returns non-array error objects.
- Files: `client/src/pages/AppDetail.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Databases.tsx`, `client/src/lib/api.ts`
- Risk: Regressions in operational workflows and misleading UI states.
- Priority: High

---

*Concerns audit: 2026-02-27*
