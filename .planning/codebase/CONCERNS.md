# Codebase Concerns

**Analysis Date:** 2026-03-07

## Tech Debt

**Command Allowlist Limitation:**
- Issue: `server/lib/allowlist.ts` only allows 7 specific commands (`dokku`, `top`, `free`, `df`, `grep`, `awk`, `curl`)
- Files: `server/lib/allowlist.ts`
- Impact: May block some Dokku operations; whitelist updates needed for new features
- Fix approach: Review and extend whitelist as needed; consider more flexible validation approach

**Duplicate Shell Quote Logic:**
- Issue: `shellQuote` function is duplicated in `server/lib/shell.ts` and `server/lib/executor.ts`
- Files: `server/lib/shell.ts:1-3`, `server/lib/executor.ts:37-39`
- Impact: Maintenance burden; changes in one file must be reflected in the other
- Fix approach: Import from one location or create shared utility module

**Rate Limiter Configuration:**
- Issue: Rate limiters use hardcoded window sizes and max requests
- Files: `server/lib/rate-limiter.ts`
- Impact: May need adjustment based on production usage patterns
- Fix approach: Consider making configurable via environment variables

## Known Bugs

**No known open bugs at this time**

(Confirmed by searching for TODO/FIXME/HACK/XXX comments - none found)

## Security Considerations

**Command Output Storage:**
- Risk: Command output is stored in database without validation for malicious content
- Files: `server/lib/db.ts` (`saveCommand`, `saveSettings`)
- Current mitigation: Parameterized statements used in SQL queries
- Recommendations: Consider sanitizing output before storage, implement output size limits

**Sensitive Data Logging:**
- Risk: Detailed error messages (potentially sensitive info) are logged to database
- Files: `server/lib/db.ts` (`stderr` field)
- Current mitigation: Logs require authentication to access
- Recommendations: Review logging patterns, consider masking for sensitive data

**Environment Variable Exposure:**
- Risk: SSH credentials and database paths passed via environment variables
- Files: `server/index.ts`, `server/lib/executor.ts`
- Current mitigation: Relies on server environment security
- Recommendations: Document secure environment variable handling best practices

**Command Execution Timeouts:**
- Risk: Some commands may timeout or hang indefinitely
- Files: `server/lib/executor.ts`
- Current mitigation: 30 second timeout for most commands, 120 seconds for git sync
- Recommendations: Monitor long-running commands, consider configurable timeouts

**Default Database Path:**
- Risk: SQLite database path defaults to `data/docklight.db` without user configuration
- Files: `server/lib/config.ts`
- Current mitigation: Configurable via `DOCKLIGHT_DB_PATH`
- Recommendations: Document defaults, consider requiring explicit configuration

## Performance Bottlenecks

**Uncached App List:**
- Problem: Every dashboard load fetches all apps with detailed info via multiple Dokku commands
- Files: `server/lib/apps.ts` (`getApps`)
- Cause: Multiple Dokku commands executed per app
- Improvement path: Implement caching with TTL, base infrastructure exists in `server/lib/cache.ts`

**Log Rotation:**
- Problem: Audit logs rotate every 5 minutes, could cause heavy database writes under high usage
- Files: `server/lib/audit-rotation.ts`
- Cause: Periodic rotation to manage log size
- Improvement path: Consider adaptive rotation intervals based on usage

**SSH Connection Pool:**
- Problem: Connection reuse depends on `node-ssh` implementation
- Files: `server/lib/executor.ts` (`sshPool`)
- Cause: Per-request connection management
- Improvement path: Monitor connection pool performance, consider connection timeouts

## Fragile Areas

**Dokku CLI Parsing:**
- Files: `server/lib/dokku.ts`, `server/lib/apps.ts`, `server/lib/git.ts`, etc.
- Why fragile: Relies on Dokku's text output which may change between versions
- Safe modification: Use centralized parsing functions, add version detection
- Test coverage: Good - most parsing functions have dedicated tests

**Date Parsing:**
- Files: `server/lib/git.ts`, `server/lib/deployment.ts`, `server/lib/ssl.ts`
- Why fragile: Multiple date formats, timezone handling
- Safe modification: Use dedicated date parsing library, standardize formats
- Test coverage: Various formats validated in tests

**SSH Target Parsing with IPv6:**
- Files: `server/lib/executor.ts` (`parseTarget`)
- Why fragile: Complex IPv6 address parsing logic
- Safe modification: Comprehensive testing of various address formats
- Test coverage: Multiple formats covered in tests

## Scaling Limits

**SQLite Write Concurrency:**
- Current capacity: better-sqlite3 allows concurrent reads but writes are sequential
- Limit: High write load could cause lock contention
- Scaling path: Consider migrating to PostgreSQL for high-usage scenarios

**Memory Usage:**
- Current capacity: Single Node.js process
- Limit: V8 heap limit (~1.4GB)
- Scaling path: For high load, implement horizontal scaling or clustering

**WebSocket Connections:**
- Current capacity: Single WebSocket server
- Limit: Connections per server limited by memory
- Scaling path: Use Redis pub/sub for multi-server WebSocket

## Dependencies at Risk

**better-sqlite3:**
- Risk: Requires native compilation, can be difficult to install on some platforms
- Impact: Database operations would fail
- Migration plan: Consider PostgreSQL or MySQL for production environments

**node-ssh:**
- Risk: Potential maintenance issues with SSH library
- Impact: Unable to execute remote commands
- Migration plan: Consider using node-stdin or direct SSH client

## Missing Critical Features

**User Management UI:**
- Problem: User management exists via API but may lack complete UI
- Blocks: Non-technical users cannot manage other users

**Backup/Restore:**
- Problem: No built-in backup mechanism for SQLite database
- Blocks: Risk of data loss

**Metrics/Monitoring:**
- Problem: No built-in performance metrics
- Blocks: Difficult to diagnose production issues

## Test Coverage Gaps

**E2E Tests:**
- What's not tested: Complete user workflows (Playwright config exists but tests may be incomplete)
- Files: `client/playwright.config.ts`, `client/e2e/` (if exists)
- Risk: UI integration issues could slip through
- Priority: Medium

**WebSocket Testing:**
- What's not tested: Client-server WebSocket integration
- Files: `server/lib/websocket.test.ts` exists but may not cover client integration
- Risk: Real-time logs could fail
- Priority: Low

---

*Concerns audit: 2026-03-07*
