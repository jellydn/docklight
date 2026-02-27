# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Vitest 2.x (configured in `.agents/skills/dev-browser/` only)
- Config: `.agents/skills/dev-browser/vitest.config.ts`
- No test framework configured for main `server/` or `client/` packages

**Assertion Library:**
- Vitest built-in (`expect`)
- Globals enabled (`globals: true` in config)

**Run Commands:**
```bash
# Dev-browser skill tests
cd .agents/skills/dev-browser
bun test              # vitest run
bun run test:watch    # vitest (watch mode)

# Main project — no test commands defined
# server/package.json — no test script
# client/package.json — no test script
```

## Test File Organization

**Location:**
- Co-located pattern intended: `src/**/*.test.ts` (per vitest include glob)
- No test files currently exist in any part of the codebase

**Naming:**
- Convention: `*.test.ts` suffix (from vitest config include pattern)

**Structure:**
```
.agents/skills/dev-browser/
├── vitest.config.ts          # Only test config in project
└── src/
    └── **/*.test.ts          # Test files (none present yet)

server/                       # No test setup
client/                       # No test setup
```

## Test Structure

**Suite Organization (from AGENTS.md guidelines):**
```typescript
import { describe, it, expect, vi } from "vitest";

describe("functionName", () => {
  it("should do something specific", () => {
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- Setup: no before/after hooks observed (no test files exist)
- Teardown: configured with generous timeouts for Playwright-based tests:
  - `testTimeout: 60000`
  - `hookTimeout: 60000`
  - `teardownTimeout: 60000`
- Environment: `node` (not jsdom/happy-dom)

## Mocking

**Framework:** Vitest `vi` (from AGENTS.md guidelines)

**Patterns (prescribed, not yet implemented):**
```typescript
import { vi } from "vitest";

// Mock external dependencies
vi.mock("./lib/executor.js", () => ({
  executeCommand: vi.fn(),
}));
```

**Notes:**
- No mocking patterns exist in the codebase yet
- Server functions wrapping `executeCommand()` are highly testable via mock injection
- `apiFetch()` in client could be mocked for component testing

## Coverage

**Requirements:** None enforced. No coverage configuration in vitest config or CI.

## Test Types

**Unit Tests:**
- Not yet implemented
- Strong candidates: server `lib/` modules (pure functions like `isValidAppName`, `isCommandAllowed`, input sanitization logic)
- `executor.ts` → mock `execAsync`, verify `saveCommand` called
- `auth.ts` → test `generateToken`/`verifyToken` round-trip, `login` validation
- `allowlist.ts` → test command matching

**Integration Tests:**
- Not yet implemented
- Server API routes in `index.ts` are candidates for supertest-style testing
- Database operations (`db.ts`) could be tested with in-memory SQLite

**E2E Tests:**
- Playwright available as dependency in dev-browser skill (`playwright: ^1.49.0`)
- Dev-browser skill designed for browser automation testing
- No E2E test files written yet
- Infrastructure exists: `server.sh` script, `start-server` script for spinning up Docklight

## Testing Gaps

**Current state:** The project has **zero test files**. Testing infrastructure exists only in the dev-browser skill (vitest + Playwright). The main server and client packages have no test runner, test scripts, or test configuration.

**High-value test targets (by risk):**
1. `server/lib/allowlist.ts` — security boundary, must validate correctly
2. `server/lib/auth.ts` — JWT generation/verification, password matching
3. `server/lib/executor.ts` — command execution, error handling
4. `server/lib/config.ts` — input sanitization logic (shell injection prevention)
5. `server/lib/domains.ts` — domain validation and sanitization
6. `server/lib/apps.ts` — `isValidAppName()`, Dokku output parsing
7. `client/src/lib/api.ts` — 401 redirect behavior, error extraction

---
*Testing analysis: 2026-02-27*
