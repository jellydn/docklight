# Codebase Concerns

**Analysis Date:** 2026-03-02
**Last Updated:** 2026-03-02

## Tech Debt

**Command Allowlist Limitations:**

- Issue: The allowlist (`server/lib/allowlist.ts`) only validates base commands, not full command strings or arguments
- Files: `server/lib/allowlist.ts`, `server/lib/executor.ts`
- Impact: Commands like `dokku apps:destroy myapp` pass validation, which may be dangerous for certain user roles
- Fix approach: Implement role-based command permissions and argument validation

**No E2E Testing:**

- Issue: No end-to-end test coverage for critical user flows
- Files: N/A
- Impact: Integration bugs may not be caught before deployment
- Fix approach: Add Playwright or similar E2E framework for critical paths (login, app deployment, config changes)

**Client-side Test Coverage:**

- Issue: Client tests use happy-dom which may not match browser behavior exactly
- Files: `client/src/**/*.test.tsx`
- Impact: Browser-specific bugs (layout, scrolling, focus) may slip through
- Fix approach: Consider Playwright for visual regression testing

## Known Bugs

**None identified** - No TODO/FIXME/HACK comments found in codebase

## Security Considerations

**Shell Command Execution:**

- Risk: The executor runs shell commands on the Dokku server via SSH
- Files: `server/lib/executor.ts`, `server/lib/allowlist.ts`
- Current mitigation: Command allowlist, SSH key auth, input validation
- Recommendations:
  - Add argument sanitization for all user inputs
  - ✅ **Per-user rate limiting implemented** (rate-limiter.ts, executor.ts:259-271)
  - ✅ **Audit logging implemented** for all server routes (auth, apps, databases, users, admin, app-config, app-domains, commands)

**WebSocket Authentication:** ✅ **RESOLVED**

- ~~Risk: WebSocket connections require valid JWT but connection limit is global~~
- Files: `server/lib/websocket.ts`
- Current mitigation: JWT verification, 50 connection max, 30-min idle timeout, **per-user connection limits (WS_MAX_CONNECTIONS_PER_USER)**
- ✅ Per-user connection limits implemented (lines 14, 160-172, 197-207)

**JWT Secret:** ✅ **RESOLVED**

- ~~Risk: Default JWT_SECRET must be changed in production~~
- Files: `server/lib/auth.ts`
- Current mitigation: **Validation on startup to reject default secrets in production** (lines 32-39)
- ✅ Startup validation implemented

**Cookie Security:** ✅ **RESOLVED**

- ~~Risk: HttpOnly cookies used but SameSite setting not explicitly configured~~
- Files: `server/lib/auth.ts`
- Current mitigation: HttpOnly flag set, **SameSite=Strict**, Secure flag in production (lines 101-102)
- ✅ SameSite=Strict and Secure flag implemented

## Performance Bottlenecks

**Synchronous Database Operations:**

- Problem: better-sqlite3 is synchronous, blocking the event loop on DB operations
- Files: `server/lib/db.ts`
- Cause: better-sqlite3 design choice for simplicity
- Improvement path: Consider connection pooling or moving DB operations to worker threads for high-traffic deployments

**SSH Connection Pooling:**

- Problem: Single SSH connection can become bottleneck for concurrent requests
- Files: `server/lib/executor.ts` (SSHPool class)
- Cause: SSH protocol limitation
- Improvement path: Current implementation uses connection pooling with TTL, which is appropriate for typical Dokku administration workloads

**No Response Caching:** ✅ **IMPROVED**

- ~~Problem: All API requests execute fresh Dokku commands~~
- Files: `server/routes/*.ts`
- Cause: Real-time data preference
- Current state: **In-memory cache** (`server/lib/cache.ts`) now used in:
  - `apps.ts` - app list and details
  - `plugins.ts` - plugin list
  - `app-domains.ts` - app domains
  - `app-ports.ts` - app ports
  - `app-network.ts` - app network config
- Remaining: Other app-specific routes could benefit from caching

## Fragile Areas

**Command Execution (executor.ts):**

- Files: `server/lib/executor.ts` (418 lines)
- Why fragile: SSH connections can fail, commands may hang, error handling is critical
- Safe modification: Always test with actual Dokku server, mock SSH in unit tests
- Test coverage: Good - `server/lib/executor.test.ts` has comprehensive tests

**App Management Logic (apps.ts):**

- Files: `server/lib/apps.ts` (991 lines)
- Why fragile: Large file with many Dokku command variations
- Safe modification: Test each app operation (create, destroy, config) individually
- Test coverage: Good - `server/lib/apps.test.ts`

**WebSocket Stream Handling:**

- Files: `server/lib/websocket.ts`
- Why fragile: Process cleanup, connection state management, error handling
- Safe modification: Test with multiple concurrent connections and disconnect scenarios
- Test coverage: Good - `server/lib/websocket.test.ts`

## Scaling Limits

**WebSocket Connections:**

- Current capacity: 50 concurrent connections (hard limit via WS_MAX_CONNECTIONS)
- Limit: Beyond 50 connections, new log streams are rejected
- Scaling path: Increase limit via env var, or implement log stream aggregation

**Command Execution Rate:**

- Current capacity: Limited by SSH connection throughput and Dokku server responsiveness
- ~~Limit: No explicit rate limiting on command execution (only auth endpoints)~~ ✅ **RESOLVED**
- Current mitigation: **Per-user command rate limiting via `CommandRateLimiter` class** (10 commands/minute per user, configurable)

**SQLite Database:**

- Current capacity: Suitable for single-server deployments (< 1000 users)
- Limit: Not designed for multi-server horizontal scaling
- Scaling path: Migrate to PostgreSQL for distributed deployments

## Dependencies at Risk

**node-ssh:**

- Risk: SSH library maintenance
- Impact: Command execution would break
- Migration plan: Consider native ssh2 or switch to HTTP-based Dokku API if available

**better-sqlite3:**

- Risk: Native module compatibility on Node upgrades
- Impact: Database operations would fail
- Migration plan: Consider sql.js (WASM) or PostgreSQL for production

## Missing Critical Features

**No User Permission System:**

- Problem: Role-based access (user/admin/operator) exists but granular permissions not enforced
- Files: `server/lib/auth.ts`
- Blocks: Cannot restrict certain users from destructive operations (app deletion, etc.)

**No Activity Feed:**

- Problem: Command history exists in DB but no UI for viewing audit trail
- Files: `server/lib/db.ts`
- Blocks: Cannot see who did what in the system

**No Backup/Restore:**

- Problem: No mechanism to backup Dokku apps or Docklight configuration
- Files: N/A
- Blocks: Risk of data loss without manual backup procedures

## Test Coverage Gaps

**Integration Tests:**

- What's not tested: Full request/response flows with real authentication
- Files: `server/index.test.ts` (minimal integration tests)
- Risk: Middleware bugs, auth flow issues
- Priority: Medium

**Client Routing:**

- What's not tested: Navigation flows, protected route redirects
- Files: `client/src/App.tsx`
- Risk: Broken navigation, unauthorized access
- Priority: Low

**Error Boundary:**

- What's not tested: React error boundary behavior
- Files: `client/src/main.tsx`
- Risk: Poor error UX when crashes occur
- Priority: Low

---

_Concerns audit: 2026-03-02_
