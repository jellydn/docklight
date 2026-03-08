# Codebase Concerns

**Analysis Date:** 2026-03-08

## Executive Summary

This analysis identifies concerns across **7 categories**: tech debt, security, performance, fragility, scaling limits, dependencies, and test coverage gaps. The codebase is functional and well-maintained (no TODO/FIXME comments found) but has specific vulnerabilities that can cause production issues.

---

## Tech Debt

**Duplicate Shell Quote Logic:**
- Issue: `shellQuote()` function exists in both `server/lib/shell.ts:1-3` and `server/lib/executor.ts:37-39`
- Impact: Maintenance burden - changes must be synchronized
- Files: `server/lib/shell.ts`, `server/lib/executor.ts:37-39`
- Fix approach: Import from `shell.ts` in `executor.ts` to eliminate duplication

**Hardcoded Validation Lists:**
- Issue: `VALID_BUILDERS = ["herokuish", "dockerfile", "pack", ""]` in deployment.ts:12
- Impact: Breaks when Dokku adds new builder types
- Files: `server/lib/deployment.ts:12-28`
- Fix approach: Consider runtime builder detection or more flexible validation

**Global Singleton State:**
- Issue: Connection pool and rate limiters use global singletons (`export const sshPool`, `export const commandRateLimiter`)
- Impact: Difficult to test, no cleanup mechanism, state persists across request boundaries
- Files: `server/lib/executor.ts:201`, `server/lib/rate-limiter.ts:47,107`
- Fix approach: Use dependency injection for better testability

**Inconsistent Error Handling:**
- Issue: Multiple fallback patterns (apps.ts:41-76, ssl.ts:152-197) with no standardization
- Impact: No metrics on which fallback works, no logging of attempts
- Files: `server/lib/apps.ts`, `server/lib/ssl.ts`
- Fix approach: Standardize error categorization and add metrics

---

## Known Bugs

**No known open bugs at this time**

(Confirmed by searching for TODO/FIXME/HACK/XXX/@ts-ignore/@ts-expect-error comments - none found)

---

## Security Considerations

**Command Allowlist Limitation:**
- Risk: Only 7 commands allowed (`dokku`, `top`, `free`, `df`, `grep`, `awk`, `curl`)
- Current mitigation: `server/lib/allowlist.ts` validates all commands
- Recommendations: Review when adding features; consider allowlist patterns instead of exact matches
- Files: `server/lib/allowlist.ts`

**Command Output Storage:**
- Risk: Command output stored without sanitization for malicious content
- Current mitigation: Parameterized SQL queries prevent injection
- Recommendations: Implement output size limits, consider sanitizing before storage
- Files: `server/lib/db.ts` (`saveCommand`, lines 49, 66, 79)

**Environment Variable Exposure:**
- Risk: 15+ environment variables for configuration (SSH credentials, database paths, secrets)
- Current mitigation: Relies on server environment security
- Recommendations: Document secure handling practices, consider secret manager integration
- Files: `server/lib/auth.ts:15,24,28`, `server/lib/server-config.ts:57-63`, `server/lib/db.ts:24`

**JWT Secret Handling:**
- Risk: Falls back to `DEFAULT_JWT_SECRET` in development if `JWT_SECRET` not set
- Current mitigation: `ALLOW_INSECURE_DEV_SECRET` check
- Recommendations: Ensure production always requires explicit `JWT_SECRET`
- Files: `server/lib/auth.ts:15-28`

**App Name Validation:**
- Risk: `isValidAppName()` only checks `/^[a-z0-9-]+$/` - no length limits
- Current mitigation: Database constraints may limit
- Recommendations: Add max length (e.g., 64 chars), validate no leading/trailing hyphens
- Files: `server/lib/apps.ts:191-192`

**Repository URL Validation:**
- Risk: `isValidRepoUrl()` uses loose patterns - accepts any `https://` or `git@` URL
- Current mitigation: SSH execution will fail for invalid URLs
- Recommendations: Add port validation, check URL structure more carefully
- Files: `server/lib/git.ts:153-160`

---

## Performance Bottlenecks

**Uncached App List (N+1 Problem):**
- Problem: Every dashboard load fetches all apps AND executes multiple commands per app
- Cause: `getApps()` → `fetchAppDetails()` executes separate Dokku command for each app's details
- Impact: 10 apps = 10+ sequential SSH commands
- Improvement path: Implement caching with TTL, base infrastructure exists in `server/lib/cache.ts`
- Files: `server/lib/apps.ts:41-118`

**Fixed Timeouts:**
- Problem: 30-second default timeout for all commands, 120s for rebuild
- Cause: `executeCommand()` timeout parameter doesn't adapt to command type
- Impact: Fast commands waste time waiting, slow commands may timeout prematurely
- Improvement path: Command-specific timeout configuration, track timeout metrics
- Files: `server/lib/executor.ts:534-609`, `server/lib/apps.ts:91,349`

**SSH Connection Pool:**
- Problem: Fixed 5-minute idle timeout, 10-second connection timeout
- Cause: Hardcoded values in `SSHPool` class
- Impact: May hold connections too long or fail on slow networks
- Improvement path: Make timeouts configurable, add adaptive backoff
- Files: `server/lib/executor.ts:119-199`

**Database Write Concurrency:**
- Problem: SQLite allows concurrent reads but sequential writes
- Impact: Audit log rotation every 5 minutes could cause contention under high load
- Improvement path: Consider PostgreSQL for high-usage scenarios, optimize rotation schedule
- Files: `server/lib/audit-rotation.ts`, `server/lib/db.ts`

---

## Fragile Areas

**Dokku CLI Output Parsing (HIGH CRITICALITY):**
- Why fragile: Relies on text output that may change between Dokku versions
- Affected files:
  - `server/lib/ssl.ts:25-124` - SSL parsing with multiple regex patterns
  - `server/lib/apps.ts:105-272` - Status, domains, processes parsing
  - `server/lib/git.ts:60-117` - Git info parsing
  - `server/lib/deployment.ts:30-101` - Deployment settings parsing
- Test coverage: POOR - parsing functions not tested individually
- Safe modification: Add version detection, centralized parsing, comprehensive regex tests
- Failure scenarios: Dokku 0.36+ format changes, missing fields, reordered output

**Date/Time Handling (HIGH CRITICALITY):**
- Problem: No timezone awareness, `CURRENT_TIMESTAMP` uses system timezone
- Affected files:
  - `server/lib/db.ts:49,66,79` - SQLite datetime defaults
  - `server/lib/apps.ts:158` - Deploy time regex `/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/`
  - `server/lib/git.ts:112` - Last updated parsing
  - `server/lib/ssl.ts:49-52` - SSL expiry extraction
- Impact: Comparisons fail across timezone boundaries, historical data breaks on timezone changes
- Fix approach: Store all datetimes in UTC, convert for display

**SSH Connection Reliability (HIGH CRITICALITY):**
- Problem: Single retry on failure, no exponential backoff, fixed 10s timeout
- Affected files: `server/lib/executor.ts:229-246,269-299`
- Issues:
  - Only one retry attempt on connection/channel failure
  - No backoff between retries
  - Regex-based error detection is fragile
  - No connection health checks
- Test coverage: POOR - no connection pool scenario tests
- Fix approach: Implement `retryWithBackoff`, add health checks, configurable timeouts

**Error Recovery (MEDIUM CRITICALITY):**
- Problem: Inconsistent retry logic, `retryWithBackoff` exists but unused in critical paths
- Files: `server/lib/retry.ts:16-36` (defined but only used in 7 files)
- Issue: SSH execution and Dokku commands don't use retry mechanism
- Fix approach: Apply retryWithBackoff to SSH and Dokku command execution

---

## Scaling Limits

**SQLite Write Concurrency:**
- Current capacity: Concurrent reads OK, writes are sequential
- Limit: High write load causes lock contention
- Scaling path: Migrate to PostgreSQL for production

**Memory Usage:**
- Current capacity: Single Node.js process with ~1.4GB V8 heap limit
- Limit: Memory leaks in connection pool or rate limiter state
- Scaling path: Horizontal scaling or clustering

**WebSocket Connections:**
- Current capacity: Single WebSocket server
- Limit: Connections limited by memory per connection
- Scaling path: Redis pub/sub for multi-server WebSocket

**Global State:**
- Current capacity: In-memory rate limit state, connection pool state
- Limit: Lost on server restart, no sharing between instances
- Scaling path: Persist state to database or Redis

---

## Dependencies at Risk

**better-sqlite3:**
- Risk: Requires native compilation, can fail on some platforms
- Impact: Database operations fail
- Migration plan: PostgreSQL or MySQL for production

**node-ssh 13.2.1:**
- Risk: Package appears unmaintained (last release ~2 years ago), using `^13.2.1`
- Impact: SSH execution fails, cannot manage Dokku
- Migration plan: Consider sshp, @rschedule/ssh, or direct SSH client

**No Minimum Dokku Version Documented:**
- Risk: Assumptions about CLI output may break with new versions
- Impact: Parsing functions fail, features break
- Migration plan: Add Dokku version detection and graceful degradation

---

## Missing Critical Features

**User Management UI:**
- Problem: User management API exists but UI may be incomplete
- Blocks: Non-technical users cannot manage other users
- Files: `server/routes/users.ts`, `client/src/pages/Users.tsx`

**Backup/Restore:**
- Problem: No built-in backup mechanism for SQLite database
- Blocks: Risk of data loss, no disaster recovery
- Recommendations: Implement automated backups to external storage

**Metrics/Monitoring:**
- Problem: No built-in performance metrics or health monitoring
- Blocks: Difficult to diagnose production issues, no alerting
- Recommendations: Add metrics for command execution times, timeout rates, SSH connection health

**Dokku Version Detection:**
- Problem: No version detection or compatibility checking
- Blocks: Cannot warn about unsupported versions or adapt parsing
- Recommendations: Add `dokku version` parsing and version-aware feature flags

---

## Test Coverage Gaps

**Critical Parsing Functions (0% Coverage):**
- `parseStatus()` - Status detection from multiple patterns
- `parseDomains()` - Domain list parsing
- `parseLetsencryptReport()` - SSL report parsing
- `parseGitReport()` - Git info parsing
- Files: `server/lib/ssl.ts`, `server/lib/apps.ts`, `server/lib/git.ts`

**Connection Pool Scenarios (0% Coverage):**
- Multiple concurrent connections
- Connection failures and retries
- Idle timeout behavior
- Pool exhaustion scenarios
- Files: `server/lib/executor.ts:119-199`

**Timeout Handling (0% Coverage):**
- Command timeout scenarios
- Timeout error propagation
- Timeout vs failure distinction
- Files: `server/lib/executor.ts:249-264`

**Edge Cases (5% Coverage):**
- App name validation (length, special chars)
- Repository URL validation (invalid schemes, ports)
- Empty/malformed Dokku output
- Missing fields in parsed output

**WebSocket Integration (Low Coverage):**
- Client-server WebSocket handshake
- Log streaming under failure conditions
- Connection cleanup

**E2E Tests (Incomplete):**
- Playwright config exists but test coverage unknown
- Files: `client/playwright.config.ts`, `client/e2e/`

---

## Recommended Action Items

### Immediate (P0 - Fix Before Production):
1. **Add timezone handling** - Convert all datetimes to UTC before storage
2. **Add app name length limits** - Prevent database issues (max 64 chars)
3. **Fix JWT secret handling** - Ensure production requires explicit secret
4. **Add command timeout metrics** - Track timeout rates

### Short-term (P1 - Fix Within 1 Month):
1. **Add parsing unit tests** - Test all regex-based parsers with edge cases
2. **Implement retryWithBackoff** - Apply to SSH and Dokku command execution
3. **Add connection pool tests** - Cover multi-connection, failure, timeout scenarios
4. **Improve repository URL validation** - Better port and scheme checking

### Medium-term (P2 - Fix Within 3 Months):
1. **Connection pool health checks** - Verify connections before reuse
2. **Dokku version detection** - Detect version and adapt parsing accordingly
3. **Graceful degradation** - Handle missing/changed Dokku output formats
4. **Consolidate shellQuote** - Import from single location

### Long-term (P3 - Plan for Next Version):
1. **Replace node-ssh** - Consider better-maintained alternatives
2. **Add metrics/monitoring** - Track performance and health
3. **Implement backup system** - Automated database backups
4. **Comprehensive testing** - 80%+ coverage for critical paths

---

## Files Requiring Immediate Attention

| Priority | File | Lines | Issue |
|----------|------|-------|-------|
| P0 | `server/lib/db.ts` | 49,66,79 | Timezone unaware CURRENT_TIMESTAMP |
| P0 | `server/lib/apps.ts` | 191-192 | App name validation needs length limit |
| P0 | `server/lib/auth.ts` | 15-28 | JWT secret fallback in production |
| P1 | `server/lib/executor.ts` | 229-299 | SSH retry logic needs improvement |
| P1 | `server/lib/apps.ts` | 105-272 | Parsing functions need unit tests |
| P1 | `server/lib/ssl.ts` | 25-124 | SSL parsing needs edge case tests |
| P2 | `server/lib/shell.ts` | 1-3 | Duplicate shellQuote - consolidate |
| P2 | `server/lib/rate-limiter.ts` | 47,107 | Global state - consider DI |

---

*Concerns audit: 2026-03-08*
