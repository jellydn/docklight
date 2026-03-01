# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Large Component Files:**
- Issue: `client/src/pages/AppDetail/index.tsx` (1,842 lines) - monolithic component handling multiple app detail views
- Files: `client/src/pages/AppDetail/index.tsx`
- Impact: Difficult to maintain, test, and understand; high cognitive load for changes
- Fix approach: Split into smaller feature-based components or extract sub-page routing

**Server Index File:**
- Issue: `server/index.ts` (836 lines) - large main server file with many route handlers
- Files: `server/index.ts`
- Impact: Hard to navigate, difficult to find specific route handlers
- Fix approach: Extract route handlers into separate router modules (e.g., `routes/apps.ts`, `routes/auth.ts`)

**Test Coverage Gaps:**
- Issue: Several source files lack corresponding test files
- Files: `server/lib/ansi.ts`, `server/lib/shell.ts`, `server/lib/websocket.ts`, `server/lib/cache.ts`, `server/lib/logger.ts`, `server/lib/network.ts`, `server/lib/docker-options.ts`, `server/lib/buildpacks.ts`, `server/lib/deployment.ts`, `server/lib/domains.ts`, `server/lib/ports.ts`
- Impact: Untested code paths may contain bugs; refactoring is risky
- Fix approach: Add test files for each module, focus on critical paths first

## Known Bugs

**Git Merge Conflict:**
- Symptoms: Both-stage merge conflict markers present in auth test file
- Files: `server/lib/auth.test.ts`
- Trigger: Appears to be an unresolved merge from a branch
- Workaround: Resolve merge conflict by accepting appropriate changes

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
- Current mitigation: Currently allowed but noted in security tests
- Recommendations:
  - Consider adding admin-only restrictions for dangerous Docker options
  - Document security implications in UI

**Authentication:**
- Risk: Legacy single-password mode alongside multi-user mode
- Files: `server/lib/auth.ts`
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
- Problem: SSH handshake overhead for each command (mitigated by pooling)
- Files: `server/lib/executor.ts` (SSHPool class)
- Cause: Network latency to remote dokku server
- Improvement path:
  - Already implemented: SSH connection pooling with 5-minute idle timeout
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
- Scaling path: Consider PostgreSQL for multi-instance deployments

**WebSocket Connections:**
- Current capacity: No explicit limit in `server/lib/websocket.ts`
- Limit: Memory and file descriptor limits
- Scaling path: Add connection limits and cleanup for stale connections

## Dependencies at Risk

**node-ssh:**
- Risk: SSH library dependency for remote command execution
- Impact: Core functionality - remote dokku commands
- Migration plan: Investigate native SSH alternatives or consider dokku HTTP API if available

**better-sqlite3:**
- Risk: Native module requiring compilation
- Impact: User management and audit logging
- Migration plan: Consider switching to sql.js for pure-JS or PostgreSQL for production scale

**Radix UI Components:**
- Risk: Multiple component dependencies (dialog, button, card, input)
- Impact: UI consistency and accessibility
- Migration plan: Low risk - actively maintained, consider consolidating to a design system

## Missing Critical Features

**Audit Log Export:**
- Problem: Audit logs stored but no export/rotation mechanism
- Blocks: Compliance requirements, log analysis
- Impact: Cannot meet data retention policies

**Backup/Restore:**
- Problem: No backup mechanism for docklight configuration (users, settings)
- Blocks: Disaster recovery, migration
- Impact: Data loss risk in catastrophic failures

**Rate Limiting Configuration:**
- Problem: Rate limits hardcoded in `server/lib/rate-limiter.ts`
- Blocks: Customization per deployment
- Impact: May be too restrictive or lenient for different use cases

**Health Check Details:**
- Problem: Basic `/api/health` endpoint doesn't check dokku connectivity
- Blocks: Proper monitoring and alerting
- Impact: False positive health status when dokku is unreachable

## Test Coverage Gaps

**Untested WebSocket Logic:**
- What's not tested: Log streaming, connection management, reconnection logic
- Files: `server/lib/websocket.ts`
- Risk: Real-time log streaming may fail silently; connection leaks
- Priority: Medium

**Untested Cache Logic:**
- What's not tested: Cache invalidation, TTL expiration, prefix clearing
- Files: `server/lib/cache.ts`
- Risk: Stale data served to users; inconsistent state
- Priority: Medium

**Untested Network Settings:**
- What's not tested: Network property setting and clearing
- Files: `server/lib/network.ts`
- Risk: Network configuration may not apply correctly
- Priority: Low

**Untested Docker Options:**
- What's not tested: Adding, removing, clearing docker options
- Files: `server/lib/docker-options.ts`
- Risk: Container configuration may be incorrect
- Priority: High (security-related)

**Untested Buildpacks:**
- What's not tested: Adding, removing, clearing buildpacks
- Files: `server/lib/buildpacks.ts`
- Risk: Build configuration may fail
- Priority: Low

**Untested Deployment Settings:**
- What's not tested: Build dir, deploy branch, builder configuration
- Files: `server/lib/deployment.ts`
- Risk: Deployment configuration may be invalid
- Priority: Medium

**Untested Domain Management:**
- What's not tested: Adding and removing domains
- Files: `server/lib/domains.ts`
- Risk: Domain routing may break
- Priority: Medium

**Untested Port Management:**
- What's not tested: Port mapping, proxy settings
- Files: `server/lib/ports.ts`
- Risk: Network exposure may be incorrect
- Priority: High (security-related)

**Untested SSL Management:**
- What's not tested: SSL enable, renew, certificate validation
- Files: `server/lib/ssl.ts`
- Risk: HTTPS may not work; certificates may expire
- Priority: High (security-related)

**Limited Client Test Coverage:**
- What's not tested: Many UI components lack tests
- Files: `client/src/components/`, `client/src/pages/`
- Risk: UI regressions may slip through; refactoring is risky
- Priority: Medium

---

*Concerns audit: 2026-03-01*
