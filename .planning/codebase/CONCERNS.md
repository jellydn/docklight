# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Client-side testing:**
- Issue: No client-side tests (Vitest only for server)
- Files: `client/src/` (no .test.tsx files)
- Impact: UI regressions may go unnoticed
- Fix approach: Add Vitest + @testing-library for React components

**Type safety in API responses:**
- Issue: Some API calls use `any` type or loose typing
- Files: `client/src/lib/api.ts`, `server/lib/*.test.ts`
- Impact: Runtime type errors possible
- Fix approach: Use zod or similar for runtime validation

## Known Bugs

**None documented**
- No active bug tracker found
- TODO/FIXME/HACK comments: None found in codebase search

## Security Considerations

**Command execution via SSH:**
- Risk: Shell command injection if allowlist is bypassed
- Files: `server/lib/executor.ts`, `server/lib/allowlist.ts`
- Current mitigation: Strict allowlist of approved commands
- Recommendations: Regular security audits of allowlist, input sanitization

**Single password authentication:**
- Risk: Shared password, no rate limiting visible
- Files: `server/lib/auth.ts`
- Current mitigation: JWT tokens with expiration, HTTPS recommended
- Recommendations: Add rate limiting, consider OAuth/LDAP for teams

**Plugin management with root:**
- Risk: Plugin install/enable/disable runs with sudo
- Files: `server/lib/plugins.ts`
- Current mitigation: Separate SSH target for root commands
- Recommendations: Document sudo requirements clearly

## Performance Bottlenecks

**SSH connection per command:**
- Problem: Each Dokku command opens new SSH connection
- Files: `server/lib/executor.ts`
- Cause: One-off command execution pattern
- Improvement path: Connection pooling or persistent SSH session

**No caching for app lists:**
- Problem: Every page load re-fetches apps from Dokku
- Files: `client/src/pages/Dashboard.tsx`
- Cause: No server-side caching layer
- Improvement path: Add in-memory cache with TTL

## Fragile Areas

**Command allowlist:**
- Files: `server/lib/allowlist.ts`
- Why fragile: Adding new Dokku features requires manual allowlist updates
- Safe modification: Add commands incrementally with tests
- Test coverage: Good (executor tests validate allowlist)

**SSH connection handling:**
- Files: `server/lib/executor.ts`
- Why fragile: Network issues, SSH key misconfig cause silent failures
- Safe modification: Add connection health checks, retry logic
- Test coverage: Needs improvement (network failure scenarios)

## Scaling Limits

**Single-server design:**
- Current capacity: 1 Dokku server
- Limit: Cannot manage multiple Dokku instances
- Scaling path: Multi-server support would require architecture redesign

**Concurrent WebSocket connections:**
- Current capacity: Limited by Node.js event loop
- Limit: Unknown (no load testing documented)
- Scaling path: WebSocket connection pooling, Redis pub/sub for multi-instance

## Dependencies at Risk

**better-sqlite3:**
- Risk: Native module, requires compilation for each platform
- Impact: Build failures if toolchain missing
- Migration plan: Use sqlite3 (pure JS) or consider serverless DB

**Dokku CLI version compatibility:**
- Risk: Breaking changes in Dokku commands
- Impact: Commands may fail on Dokku updates
- Migration plan: Version pinning, command abstraction layer

## Missing Critical Features

**User management:**
- Problem: Single admin user only
- Blocks: Team collaboration, audit trails
- Priority: Medium (documented as solo dev tool)

**Multi-server support:**
- Problem: Can only manage one Dokku instance
- Blocks: Managing multiple VPS from one UI
- Priority: Low (out of scope per design)

**Configuration backup/restore:**
- Problem: No way to backup/restore app configs
- Blocks: Disaster recovery
- Priority: Low (Dokku has its own backup mechanisms)

## Test Coverage Gaps

**Client-side:**
- What's not tested: All React components and pages
- Files: `client/src/components/`, `client/src/pages/`
- Risk: UI regressions, broken user flows
- Priority: High

**WebSocket server:**
- What's not tested: Log streaming, connection handling
- Files: `server/lib/websocket.ts`
- Risk: Log viewer may break without detection
- Priority: Medium

**Error scenarios:**
- What's not tested: Network failures, SSH timeouts, invalid responses
- Files: `server/lib/executor.ts`, integration tests
- Risk: Poor error handling in production
- Priority: Medium

---

*Concerns audit: 2026-02-28*
