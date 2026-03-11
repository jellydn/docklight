# Codebase Concerns

**Analysis Date:** 2026-03-11

## Tech Debt

**ANSI Code Parsing:** ✅ Resolved
- Was: Manual ANSI escape code parsing in `server/lib/ansi.ts`
- Fix: Replaced with `strip-ansi` library plus stray ESC cleanup
- Files: `server/lib/ansi.ts`, `server/lib/apps.ts` (usage)

**CLI Output Parsing:**
- Issue: Heavy reliance on parsing Dokku CLI output throughout codebase
- Files: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/*.ts`
- Impact: Breaking if Dokku changes output format
- Fix approach: Add more robust parsing with fallbacks, test with various Dokku versions

## Known Bugs

**None documented**

## Security Considerations

**SSH Key Storage:**
- Risk: SSH keys stored in environment variables or files
- Files: `server/lib/executor.ts`
- Current mitigation: Uses SSH key path from env, not the key itself
- Recommendations: Ensure SSH key files have proper permissions (600)

**Command Execution:**
- Risk: Shell command execution is inherently dangerous
- Files: `server/lib/executor.ts`, `server/lib/allowlist.ts`
- Current mitigation: Command allowlist, rate limiting, authentication
- Recommendations: Regular security audits, monitor command execution logs

**JWT Secret:**
- Risk: Weak JWT secret can lead to session hijacking
- Files: `server/lib/auth.ts`
- Current mitigation: Fails fast in production if JWT_SECRET not set
- Recommendations: Use strong random secrets, rotate periodically

**Rate Limiting:**
- Risk: DoS attacks on expensive operations
- Files: `server/lib/rate-limiter.ts`
- Current mitigation: Per-user rate limiting on auth, commands, admin actions
- Recommendations: Monitor for abuse, adjust limits based on usage

## Performance Bottlenecks

**SSH Connection Pool:**
- Problem: SSH connections can be slow to establish
- Files: `server/lib/executor.ts` (SSHPool class)
- Cause: Network latency, SSH handshake overhead
- Improvement path: Connection pooling already implemented, consider increasing pool size

**Dokku Command Execution:**
- Problem: Each command is a synchronous shell operation
- Files: `server/lib/executor.ts`, `server/lib/dokku.ts`
- Cause: Dokku CLI is inherently sequential
- Improvement path: Cache results where possible, use parallel execution for independent commands

**App List on Dashboard:**
- Problem: Fetching all apps requires multiple Dokku commands
- Files: `server/lib/apps.ts` (getApps function)
- Cause: Each app needs separate ps:report, domains:report, git:report
- Improvement path: Consider caching app list, incremental updates

## Fragile Areas

**CLI Output Parsing:**
- Files: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`
- Why fragile: Depends on Dokku's text output format
- Safe modification: Add more test fixtures from different Dokku versions
- Test coverage: Good coverage of parsing functions (apps.test.ts, ssl.parsing.test.ts)

**ANSI Parsing:** ✅ Resolved
- Files: `server/lib/ansi.ts`
- Now uses `strip-ansi` library with stray ESC cleanup
- Test coverage: Has tests (ansi.test.ts)

**WebSocket Reconnection:**
- Files: `server/lib/websocket.ts`, `client/src/hooks/use-streaming-action.ts`
- Why fragile: Network issues, SSH timeouts
- Safe modification: Add reconnection logic, heartbeat messages
- Test coverage: Limited (websocket.test.ts exists)

## Scaling Limits

**Single Server:**
- Current capacity: Designed for single-node Dokku deployments
- Limit: Cannot manage multiple Dokku servers
- Scaling path: Would need major refactor to support multi-server

**SQLite Database:**
- Current capacity: Suitable for single-server deployment
- Limit: Not suitable for horizontal scaling
- Scaling path: Migrate to PostgreSQL/MySQL if needed

**In-Memory Cache:**
- Current capacity: Simple in-memory cache
- Limit: Lost on restart, no sharing across processes
- Scaling path: Consider Redis for distributed caching

## Dependencies at Risk

**node-ssh:**
- Risk: Maintainer may stop updating, has native dependencies
- Impact: SSH execution would break
- Migration plan: Consider using native SSH client or alternative library

**better-sqlite3:**
- Risk: Native module, requires compilation
- Impact: Database operations would fail
- Migration plan: Could switch to sql.js (WASM) or other SQLite bindings

## Missing Critical Features

**No Multi-Server Support:**
- Problem: Can only manage one Dokku server
- Blocks: Managing multiple servers from one UI

**No Real-Time Updates:**
- Problem: UI requires manual refresh for app status changes
- Blocks: Live dashboards, automatic status updates
- Possible solution: WebSocket-based push notifications

**No Backup/Restore:**
- Problem: No built-in backup functionality
- Blocks: Disaster recovery, data portability
- Possible solution: Add backup endpoints for database and config export

## Test Coverage Gaps

**WebSocket Testing:**
- What's not tested: Full WebSocket lifecycle, reconnection scenarios
- Files: `server/lib/websocket.ts`, `client/src/hooks/use-streaming-action.ts`
- Risk: Connection issues may not be caught in tests
- Priority: Medium

**E2E Testing:**
- What's not tested: Full user workflows across multiple pages
- Files: `client/playwright.config.ts` exists but test coverage unknown
- Risk: Integration issues between components
- Priority: Low (unit tests are good)

**Error Paths:**
- What's not tested: Some error scenarios in API routes
- Files: `server/routes/*.ts`
- Risk: Unhandled errors may return unexpected responses
- Priority: Low (error handling is generally good)

---

*Concerns audit: 2026-03-11*
