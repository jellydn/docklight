# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**Dokku Output Parsing:**
- Issue: String parsing relies on specific Dokku CLI output format that may change
- Files: `server/lib/apps.ts`, `server/lib/ssl.ts`, `server/lib/network.ts`, `server/lib/deployment.ts`
- Impact: Breaking changes when Dokku versions update
- Fix approach: Implement more robust parsing with fallbacks, use structured output (Dokku 0.30+)

**Duplicated Validation Patterns:**
- Issue: Similar validation and error handling patterns repeated across modules
- Files: `server/lib/*.ts` (multiple modules)
- Impact: Code duplication, harder to maintain
- Fix approach: Extract common patterns into utility functions

**In-Memory Cache Without Persistence:**
- Issue: Cache is lost on process restart, no eviction policy
- Files: `server/lib/cache.ts`
- Impact: Temporary performance hit after restarts
- Fix approach: Consider Redis or implement LRU eviction

## Known Bugs

**No confirmed bugs** - Test coverage is comprehensive

## Security Considerations

**JWT Default Secret:**
- Risk: Default secret could allow token forgery if JWT_SECRET not set
- Files: `server/lib/auth.ts`
- Current mitigation: Runtime check warns if default is used
- Recommendations: Make JWT_SECRET strictly required, no default value

**Command Allowlist Completeness:**
- Risk: Allowlist may not cover all necessary Dokku operations; `grep`, `awk`, `curl` allow remote code execution
- Files: `server/lib/allowlist.ts`
- Current mitigation: Basic command allowlist enforcement
- Recommendations: Expand allowlist with explicit Dokku commands, add parameter validation

**Command Output Size:**
- Risk: Unlimited command output stored in database, could include sensitive data
- Files: `server/lib/executor.ts`, `server/lib/db.ts`
- Current mitigation: None
- Recommendations: Implement max output size (4KB), sanitize sensitive data

**WebSocket Connection Limits:**
- Risk: No per-IP WebSocket connection limits, potential DoS
- Files: `server/lib/websocket.ts`
- Current mitigation: Per-user and global limits only
- Recommendations: Add per-IP connection limits and burst protection

## Performance Bottlenecks

**Sequential App Listing:**
- Problem: `getApps()` executes multiple Dokku commands sequentially with string parsing
- Files: `server/lib/apps.ts`
- Cause: Each app requires separate `ps:report` and `domains:report` calls
- Improvement path: Parallel execution, result caching, batch operations

**Database Connection:**
- Problem: Single SQLite connection, no WAL mode
- Files: `server/lib/db.ts`
- Cause: Default SQLite configuration
- Improvement path: Enable WAL mode, monitor for SQLITE_BUSY errors

**No Query Result Caching:**
- Problem: Repeated API calls execute Dokku commands every time
- Files: `server/routes/*.ts`
- Cause: No caching layer
- Improvement path: Implement intelligent caching with TTL

## Fragile Areas

**Dokku CLI Integration:**
- Files: `server/lib/dokku.ts`, `server/lib/apps.ts`, `server/lib/ssl.ts`
- Why fragile: Parsing CLI output assumes specific format
- Safe modification: Add test coverage for various Dokku versions
- Test coverage: Good, but version-specific testing needed

**Error Handling:**
- Files: Multiple modules using generic `catch (error: unknown)`
- Why fragile: Generic error messages, poor debugging context
- Safe modification: Implement structured error types
- Test coverage: Moderate, needs more error scenario tests

## Scaling Limits

**WebSocket Connections:**
- Current capacity: 50 global, 5 per user
- Limit: Memory and file descriptor limits
- Scaling path: Adjust `WS_MAX_CONNECTIONS` env var

**SSH Connection Pool:**
- Current capacity: One connection per unique target
- Limit: Remote server connection limits
- Scaling path: Pool size is per-target, scales horizontally

**SQLite Concurrency:**
- Current capacity: Single writer, multiple readers
- Limit: Write performance under high concurrency
- Scaling path: Enable WAL mode for better concurrency

## Dependencies at Risk

**node-ssh:**
- Risk: Package may have infrequent updates
- Impact: SSH connection failures
- Migration plan: Monitor for updates, consider native SSH client

**better-sqlite3:**
- Risk: Native module, requires rebuild on Node version changes
- Impact: Database operations fail
- Migration plan: Pre-built binaries available, monitor Node version support

## Missing Critical Features

**None identified** - Core functionality is complete

## Test Coverage Gaps

**Dokku Version Testing:**
- What's not tested: Different Dokku CLI output formats
- Files: `server/lib/*.test.ts`
- Risk: Breaking changes with Dokku updates
- Priority: Medium

**Error Scenario Tests:**
- What's not tested: All error paths and edge cases
- Files: Various test files
- Risk: Unexpected failures in production
- Priority: Low

**WebSocket Error Handling:**
- What's not tested: Connection failures, reconnection scenarios
- Files: `server/lib/websocket.test.ts`
- Risk: Poor user experience on connection issues
- Priority: Low

## Good Practices

- Comprehensive security tests in `server/lib/security.test.ts`
- Graceful shutdown with proper cleanup
- Input validation on all user inputs
- Multiple layers of rate limiting
- Health endpoint with connectivity checks
- 201 test files with good coverage

---

*Concerns audit: 2026-03-04*
