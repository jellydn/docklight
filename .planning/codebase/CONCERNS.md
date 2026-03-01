# Codebase Concerns

**Analysis Date:** 2026-03-01

---

## Resolution Tracking

**Last Updated:** 2026-03-01

| Status | Count | Details |
|--------|-------|---------|
| ✅ Fixed | 5 | Server index, Git conflict, SSL tests, Cache tests, AppDetail refactor |
| 📋 Issues Created | 15 | 6 existing + 9 new (2026-03-01) |
| 📊 Total Concerns | 20 | Tech debt, bugs, security, performance, test gaps |

**New Issues Created (2026-03-01):**
- #51: Audit log export and rotation
- #48: Backup/restore for configuration
- #49: Configurable rate limiting
- #50: Enhanced health check with dokku connectivity
- #52: Docker options tests
- #53: Port management tests
- #54: Domains, deployment, buildpacks, network tests
- #55: IPv6 SSH support
- #56: WebSocket connection limits

**Existing Issues (addressing concerns):**
- #17: WebSocket tests
- #18: SSH executor error tests
- #19: Multi-user support
- #21: better-sqlite3 alternative
- #34: Server settings UI
- #45: 2FA support
- #43: AppDetail refactor (CLOSED)

---

## Tech Debt

**Large Component Files:**
- Status: ✅ FIXED - Issue #43 CLOSED
- Files: `client/src/pages/AppDetail/index.tsx`
- Resolution: Component was refactored (1,842 lines → smaller modules)

**Server Index File:**
- Status: ✅ FIXED
- Files: `server/index.ts`
- Resolution: Refactored from 836 lines → 79 lines; routes extracted to `server/routes/` modules

**Test Coverage Gaps:**
- Status: 📋 Partially Addressed
- Files: `server/lib/ansi.ts`, `server/lib/shell.ts`, `server/lib/websocket.ts`, `server/lib/cache.ts`, `server/lib/logger.ts`, `server/lib/network.ts`, `server/lib/docker-options.ts`, `server/lib/buildpacks.ts`, `server/lib/deployment.ts`, `server/lib/domains.ts`, `server/lib/ports.ts`
- Issues: #17, #52, #53, #54
- Impact: Untested code paths may contain bugs; refactoring is risky
- Fix approach: Add test files for each module, focus on critical paths first

## Known Bugs

**Git Merge Conflict:**
- Status: ✅ FIXED
- Files: `server/lib/auth.test.ts`
- Resolution: Merge conflict markers removed; file is clean

## Security Considerations

**Shell Command Execution:**
- Risk: Direct shell command execution via SSH and local child_process
- Files: `server/lib/executor.ts`, `server/lib/allowlist.ts`
- Current mitigation:
  - Command allowlist (`dokku`, `top`, `free`, `df`, `grep`, `awk`, `curl`)
  - Input validation with regex patterns for app names, domains, config keys/values
  - Shell quoting via `shellQuote()` function
  - Comprehensive security test suite in `server/lib/security.test.ts`
- Recommendations:
  - Consider implementing command argument validation at a deeper level
  - Review SSH key storage and rotation policies
  - Add audit logging for all command executions (partially implemented via `saveCommand`)

**Docker Options Security:**
- Risk: Tests explicitly allow `--privileged` and `--network=host` flags
- Files: `server/lib/docker-options.ts`, `server/lib/security.test.ts`
- Issue: #52
- Current mitigation: Currently allowed but noted in security tests
- Recommendations:
  - Consider adding admin-only restrictions for dangerous Docker options
  - Document security implications in UI

**Authentication:**
- Risk: Legacy single-password mode alongside multi-user mode
- Files: `server/lib/auth.ts`
- Issue: #19 (multi-user), #45 (2FA)
- Current mitigation: JWT-based auth with role-based access control
- Recommendations:
  - Consider deprecating single-password mode in favor of multi-user only
  - Implement password complexity requirements
  - Add MFA support

## Performance Bottlenecks

**App Detail Loading:**
- Problem: Sequential or parallel execution of multiple dokku commands per app
- Files: `server/lib/apps.ts` (fetchAppDetails function)
- Cause: Each app requires separate `ps:report` and `domains:report` commands
- Improvement path:
  - Consider caching app details with appropriate invalidation
  - Implement batch operations where dokku supports them
  - Add request debouncing for frequently accessed apps

**SSH Connection Overhead:**
- Status: ✅ MITIGATED
- Problem: SSH handshake overhead for each command
- Files: `server/lib/executor.ts` (SSHPool class)
- Cause: Network latency to remote dokku server
- Resolution: SSH connection pooling with 5-minute idle timeout implemented
- Improvement path:
  - Consider connection warmup on startup
  - Add metrics for connection reuse rate

**Large Client Bundle:**
- Problem: Client includes many dependencies and large icon library
- Files: `client/src/`, `client/node_modules/lucide-react`
- Cause: lucide-react exports all icons (37K+ lines of type definitions)
- Improvement path:
  - Use tree-shaking for icon imports (already available)
  - Consider code splitting for route-based chunks
  - Analyze bundle size with build tools

## Fragile Areas

**Status Parsing Logic:**
- Files: `server/lib/apps.ts` (parseStatus, parseDomains, parseProcesses functions)
- Why fragile: Relies on regex parsing of dokku command output which may change between versions
- Safe modification: Add version detection or structured output parsing if dokku provides it
- Test coverage: Good coverage in `apps.test.ts` but should test against multiple dokku versions

**Error Handling Patterns:**
- Files: Throughout `server/lib/*.ts` (repeated try-catch with `error: unknown`)
- Why fragile: Generic error handling may lose context; inconsistent error response shapes
- Safe modification: Create standardized error handling middleware
- Test coverage: Partial - errors are tested but error types aren't consistently validated

**SSH Target Parsing:**
- Files: `server/lib/executor.ts` (parseTarget function)
- Issue: #55
- Why fragile: Limited IPv6 support, assumes specific format
- Safe modification: Add comprehensive IPv6 support or use proper SSH URL parsing library
- Test coverage: Needs dedicated tests for edge cases

## Scaling Limits

**Concurrent Command Execution:**
- Current capacity: Limited by SSH connection pool (no explicit limit set)
- Limit: May exhaust dokku server resources or hit file descriptor limits
- Scaling path:
  - Add configurable max concurrent connections
  - Implement command queue with priority
  - Add circuit breaker for failing dokku commands

**Database Connections:**
- Current capacity: better-sqlite3 (single-file, no connection pooling needed)
- Limit: SQLite not suitable for high-concurrency write scenarios
- Issue: #21
- Scaling path: Consider PostgreSQL for multi-instance deployments

**WebSocket Connections:**
- Current capacity: No explicit limit in `server/lib/websocket.ts`
- Limit: Memory and file descriptor limits
- Issue: #56
- Scaling path: Add connection limits and cleanup for stale connections

## Dependencies at Risk

**node-ssh:**
- Risk: SSH library dependency for remote command execution
- Impact: Core functionality - remote dokku commands
- Migration plan: Investigate native SSH alternatives or consider dokku HTTP API if available

**better-sqlite3:**
- Risk: Native module requiring compilation
- Impact: User management and audit logging
- Issue: #21
- Migration plan: Consider switching to sql.js for pure-JS or PostgreSQL for production scale

**Radix UI Components:**
- Risk: Multiple component dependencies (dialog, button, card, input)
- Impact: UI consistency and accessibility
- Migration plan: Low risk - actively maintained, consider consolidating to a design system

## Missing Critical Features

**Audit Log Export:**
- Issue: #51
- Problem: Audit logs stored but no export/rotation mechanism
- Blocks: Compliance requirements, log analysis
- Impact: Cannot meet data retention policies

**Backup/Restore:**
- Issue: #48
- Problem: No backup mechanism for docklight configuration (users, settings)
- Blocks: Disaster recovery, migration
- Impact: Data loss risk in catastrophic failures

**Rate Limiting Configuration:**
- Issue: #49
- Problem: Rate limits hardcoded in `server/lib/rate-limiter.ts`
- Blocks: Customization per deployment
- Impact: May be too restrictive or lenient for different use cases

**Health Check Details:**
- Issue: #50
- Problem: Basic `/api/health` endpoint doesn't check dokku connectivity
- Blocks: Proper monitoring and alerting
- Impact: False positive health status when dokku is unreachable

## Test Coverage Gaps

**Untested WebSocket Logic:**
- Issue: #17
- What's not tested: Log streaming, connection management, reconnection logic
- Files: `server/lib/websocket.ts`
- Risk: Real-time log streaming may fail silently; connection leaks
- Priority: Medium

**Untested Cache Logic:**
- Status: ✅ FIXED - `cache.test.ts` exists
- Files: `server/lib/cache.ts`

**Untested SSL Management:**
- Status: ✅ FIXED - `ssl.test.ts` exists
- Files: `server/lib/ssl.ts`

**Untested Network Settings:**
- Issue: #54
- What's not tested: Network property setting and clearing
- Files: `server/lib/network.ts`
- Risk: Network configuration may not apply correctly
- Priority: Low

**Untested Docker Options:**
- Issue: #52
- What's not tested: Adding, removing, clearing docker options
- Files: `server/lib/docker-options.ts`
- Risk: Container configuration may be incorrect
- Priority: High (security-related)

**Untested Buildpacks:**
- Issue: #54
- What's not tested: Adding, removing, clearing buildpacks
- Files: `server/lib/buildpacks.ts`
- Risk: Build configuration may fail
- Priority: Low

**Untested Deployment Settings:**
- Issue: #54
- What's not tested: Build dir, deploy branch, builder configuration
- Files: `server/lib/deployment.ts`
- Risk: Deployment configuration may be invalid
- Priority: Medium

**Untested Domain Management:**
- Issue: #54
- What's not tested: Adding and removing domains
- Files: `server/lib/domains.ts`
- Risk: Domain routing may break
- Priority: Medium

**Untested Port Management:**
- Issue: #53
- What's not tested: Port mapping, proxy settings
- Files: `server/lib/ports.ts`
- Risk: Network exposure may be incorrect
- Priority: High (security-related)

**Limited Client Test Coverage:**
- What's not tested: Many UI components lack tests
- Files: `client/src/components/`, `client/src/pages/`
- Risk: UI regressions may slip through; refactoring is risky
- Priority: Medium

---

*Concerns audit: 2026-03-01*
*Resolution tracking updated: 2026-03-01*
