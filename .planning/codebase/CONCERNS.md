# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Command Output Parsing:**
- Issue: Fragile string parsing for Dokku command output (multiple output formats handled)
- Files: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`
- Impact: May break if Dokku changes output format
- Fix approach: Consider using Dokku's JSON output options if available, or consolidate parsing utilities

**ANSI Code Stripping:**
- Issue: Manual ANSI escape code handling throughout codebase
- Files: `server/lib/apps.ts` (strip-ansi-cjs dependency present)
- Impact: Output may contain color codes if not properly stripped
- Fix approach: Centralize ANSI stripping in executor or utility function

**Cache Invalidation:**
- Issue: Prefix-based cache invalidation may miss edge cases
- Files: `server/lib/cache.ts`, usage throughout `server/index.ts`
- Impact: Stale data could be served after operations
- Fix approach: Consider tag-based or more granular invalidation

## Known Bugs

**No tracked bugs** - Issue tracking not visible in this codebase

## Security Considerations

**Shell Injection Risk:**
- Risk: User input used in shell commands (mitigated by allowlist)
- Files: `server/lib/allowlist.ts`, `server/lib/executor.ts`
- Current mitigation: Command allowlist enforced before execution
- Recommendations: Regular audit of allowlist, consider sandboxing

**Password Storage:**
- Risk: Password stored in environment variable only
- Files: `server/lib/auth.ts`
- Current mitigation: Single password for all users (simple deployment)
- Recommendations: Consider password hashing, multi-user support for production

**Session Management:**
- Risk: JWT tokens in cookies without explicit expiry configuration visible
- Files: `server/lib/auth.ts`
- Current mitigation: httpOnly cookies prevent XSS access
- Recommendations: Document session timeout policy, consider refresh tokens

**Sudo Password Handling:**
- Risk: Sudo passwords passed through API for plugin operations
- Files: `server/index.ts`, `server/lib/plugins.ts`
- Current mitigation: Optional, only for plugin enable/disable/uninstall
- Recommendations: Consider server-side credential management

## Performance Bottlenecks

**Sequential App Listing:**
- Problem: Each app requires 2-3 shell commands (ps:report, domains:report)
- Files: `server/lib/apps.ts`
- Cause: Dokku CLI design (no batch API)
- Improvement path: Consider parallel execution with Promise.all()

**Cache Warming:**
- Problem: First request after server start is slow (cache empty)
- Files: `server/lib/cache.ts`
- Cause: On-demand cache population
- Improvement path: Background cache warming on server startup

## Fragile Areas

**Dokku Output Parsing:**
- Files: `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`
- Why fragile: Depends on Dokku CLI output format
- Safe modification: Add tests for each output format variation
- Test coverage: Good coverage in `apps.test.ts`, extend to other parsers

**App Name Validation:**
- Files: `server/lib/apps.ts` (`isValidAppName`)
- Why fragile: Regex must match Dokku's naming rules
- Safe modification: Update regex if Dokku changes rules
- Test coverage: Good test coverage for valid/invalid names

## Scaling Limits

**Server Process:**
- Current capacity: Single-process Express server
- Limit: Blocked by in-memory cache and WebSocket connections
- Scaling path: Add Redis for shared cache, separate WebSocket servers

**Database:**
- Current capacity: SQLite for command history only
- Limit: Not designed for high write throughput
- Scaling path: SQLite is sufficient for current audit log use case

## Dependencies at Risk

**better-sqlite3:**
- Risk: Native module, requires compilation
- Impact: Server won't start if compilation fails
- Migration plan: Use Bun's native SQLite or consider pure JS alternative

**Express 5.0.0:**
- Risk: May have breaking changes from v4
- Impact: Middleware compatibility
- Migration plan: Currently stable, monitor for issues

**React 19.2.0:**
- Risk: Latest major version, potential ecosystem issues
- Impact: Component library compatibility
- Migration plan: Monitor third-party library updates

## Missing Critical Features

**Multi-user Support:**
- Problem: Single shared password for authentication
- Blocks: Role-based access control, user-specific permissions

**Audit Logging:**
- Problem: Commands stored in SQLite but no UI for viewing
- Blocks: Compliance auditing, troubleshooting historical issues

**Configuration Persistence:**
- Problem: No UI for managing server configuration
- Blocks: Changing port, password without server restart

## Test Coverage Gaps

**Executor Module:**
- What's not tested: `server/lib/executor.ts` has no visible test file
- Files: `server/lib/executor.ts`
- Risk: Core shell execution logic untested
- Priority: High

**WebSocket Log Streaming:**
- What's not tested: `server/lib/websocket.ts` has no visible test file
- Files: `server/lib/websocket.ts`
- Risk: Real-time functionality untested
- Priority: Medium

**Client Pages:**
- What's not tested: Most page components lack test files
- Files: `client/src/pages/*.tsx`
- Risk: UI integration bugs
- Priority: Medium

**E2E Tests:**
- What's not tested: Full user flows (login → create app → deploy)
- Files: `.agents/skills/dev-browser/` (infrastructure exists but coverage unknown)
- Risk: Integration issues between components
- Priority: Low (dev-browser skill exists)

---

*Concerns audit: 2026-02-28*
