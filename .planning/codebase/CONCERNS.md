# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**No explicit tech debt documented** - Codebase is relatively new and clean

## Known Bugs

**No known bugs documented** - Issue tracking appears to be through GitHub Issues

## Security Considerations

**Default JWT Secret:**
- Risk: Using default secret "docklight-default-secret-change-in-production" allows JWT forgery
- Files: `server/lib/auth.ts:5`
- Current mitigation: Warning logged if DOCKLIGHT_SECRET not set
- Recommendations: Enforce DOCKLIGHT_SECRET in production, fail to start if missing

**Command Injection via SSH:**
- Risk: Malicious app names or parameters could execute arbitrary commands
- Files: `server/lib/allowlist.ts`, `server/lib/apps.ts`
- Current mitigation: Command allowlist, regex validation for app names
- Recommendations: Regular security audits, input fuzzing tests

**Rate Limiting:**
- Risk: Brute force attacks on login endpoint
- Files: `server/lib/rate-limiter.ts`, `server/lib/auth.ts`
- Current mitigation: 5 attempts per 15-minute window
- Recommendations: Consider account lockout after repeated failures

**Authentication Cookie:**
- Risk: CSRF if not properly configured
- Files: `server/lib/auth.ts:50`
- Current mitigation: httpOnly flag, secure flag in production
- Recommendations: Consider adding SameSite attribute

## Performance Bottlenecks

**No caching for real-time data:**
- Problem: Each API request may trigger SSH command to remote server
- Files: `server/lib/executor.ts`, `server/lib/cache.ts`
- Cause: Limited caching (only 30s TTL for app lists)
- Improvement path: Increase cache TTL, implement cache invalidation on changes

**SSH connection overhead:**
- Problem: Per-command SSH handshake when connection pool is cold
- Files: `server/lib/executor.ts` (SSHPool class)
- Cause: 5-minute idle timeout closes connections
- Improvement path: Consider longer idle timeout, warm-up connections on startup

**Large frontend bundle:**
- Problem: AppDetail.tsx is 2770 lines - may impact initial load
- Files: `client/src/pages/AppDetail.tsx`
- Cause: Monolithic component with multiple features
- Improvement path: Split into smaller components, implement code splitting

**No database query optimization:**
- Problem: SQLite audit log queries not optimized for large datasets
- Files: `server/lib/db.ts`
- Cause: No indexes defined on tables
- Improvement path: Add indexes on commonly queried columns

## Fragile Areas

**SSH Connection Management:**
- Files: `server/lib/executor.ts` (SSHPool class, lines 89-195)
- Why fragile: Network issues can cause hanging connections, connection pool exhaustion
- Safe modification: Always close connections in finally blocks, use timeouts
- Test coverage: Good coverage for connection pool logic

**WebSocket Log Streaming:**
- Files: `server/lib/websocket.ts`, `server/lib/executor.ts`
- Why fragile: Process spawning and cleanup can be tricky, zombie processes possible
- Safe modification: Always kill child processes on disconnect, use proper cleanup
- Test coverage: Limited - integration tests recommended

**Command Parsing:**
- Files: `server/lib/apps.ts`, `server/lib/ports.ts`, `server/lib/domains.ts`
- Why fragile: Depends on Dokku CLI output format which may change
- Safe modification: Use strict parsers, validate output structure
- Test coverage: Good - mocked Dokku responses

**Dokku Command Builders:**
- Files: `server/lib/dokku.ts` (240 lines)
- Why fragile: Changes to Dokku CLI break all dependent code
- Safe modification: Pin Dokku version, test against real Dokku instance
- Test coverage: Unit tests for command builders

## Scaling Limits

**Concurrent SSH Connections:**
- Current capacity: Limited by SSH pool size and server resources
- Limit: No explicit connection limit configured
- Scaling path: Implement connection pool size limits, queue system

**SQLite Database:**
- Current capacity: Suitable for single-server deployment
- Limit: SQLite not optimized for high write concurrency
- Scaling path: Migrate to PostgreSQL/MySQL for multi-server deployments

**In-Memory Cache:**
- Current capacity: Limited by Node.js heap size
- Limit: Cache not shared across multiple server instances
- Scaling path: Implement Redis or similar for distributed caching

**WebSocket Connections:**
- Current capacity: Limited by server memory and file descriptors
- Limit: No connection limit configured
- Scaling path: Implement Redis adapter for WebSocket pub/sub

## Dependencies at Risk

**node-ssh:**
- Risk: SSH library may have vulnerabilities or become unmaintained
- Impact: Breaks all remote command execution
- Migration plan: Consider using native SSH2 or alternative SSH libraries

**better-sqlite3:**
- Risk: Native module may have compilation issues on some platforms
- Impact: Audit logging functionality
- Migration plan: Consider sql.js (WASM) or other pure-JS SQLite implementations

**Express 5.0.0:**
- Risk: Using major version that may have breaking changes
- Impact: Middleware and route handling
- Migration plan: Pin to stable version, monitor for breaking changes

## Missing Critical Features

**User Management:**
- Problem: Single admin user, no multi-user support
- Blocks: Team collaboration, audit trails per user

**Role-Based Access Control:**
- Problem: No permission system for different access levels
- Blocks: Restricting sensitive operations to specific users

**Configuration Backup/Restore:**
- Problem: No way to backup or restore Docklight configuration
- Blocks: Disaster recovery, migration between servers

**Two-Factor Authentication:**
- Problem: No 2FA support
- Blocks: Enhanced security for production deployments

**Health Check Endpoint:**
- Problem: No /health endpoint for monitoring
- Blocks: Proper health monitoring in production

## Test Coverage Gaps

**WebSocket Integration Tests:**
- What's not tested: Real WebSocket connection lifecycle
- Files: `server/lib/websocket.ts`
- Risk: Log streaming may fail in production
- Priority: High

**SSH Connection Pool Recovery:**
- What's not tested: Connection recovery after network failure
- Files: `server/lib/executor.ts`
- Risk: Server may become unresponsive after network issues
- Priority: Medium

**End-to-End User Flows:**
- What's not tested: Complete user journeys from UI to Dokku
- Files: Client/server integration
- Risk: UI/Backend integration bugs
- Priority: Low (manual testing covers this)

**Error Boundary Components:**
- What's not tested: React error boundary behavior
- Files: `client/src/App.tsx`, `client/src/components/`
- Risk: Poor error handling in production
- Priority: Low

---
*Concerns audit: 2026-02-28*
