# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- Vitest 4.0.0
- Config: `server/vitest.config.ts`, `client/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions (Chai-compatible)

**Run Commands:**
```bash
bun test              # Run all tests (justfile)
just test             # Alternative via just
bun run test:watch    # Watch mode
bun run test:coverage # Run with coverage
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Pattern: `*.test.ts` for server, `*.test.tsx` for client

**Naming:**
- Same name as source file with `.test.ts` suffix
- Example: `executor.test.ts` tests `executor.ts`

**Structure:**
```
server/
├── lib/
│   ├── executor.ts
│   ├── executor.test.ts
│   ├── apps.ts
│   └── apps.test.ts
client/src/
├── pages/
│   ├── Apps.tsx
│   └── Apps.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Function/module name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something when condition is met", () => {
    // Arrange
    const input = { ... };

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

**Patterns:**
- Setup: `beforeEach()` to reset mocks between tests
- Teardown: Vitest auto-cleanup, explicit cleanup in `afterEach()` if needed
- Assertion: `expect().to*()` matchers

## Mocking

**Framework:** Vitest built-in mocking (`vi.mock()`, `vi.fn()`, `vi.mocked()`)

**Patterns:**
```typescript
// Module-level mocking
vi.mock("./lib/executor.js", () => ({
  executeCommand: vi.fn(),
}));

// Using mocks in tests
vi.mocked(executeCommand).mockResolvedValue({
  exitCode: 0,
  stdout: "output",
  stderr: "",
  command: "test",
});

// Type-safe mocking
import { getApps } from "./lib/apps.js";
vi.mocked(getApps).mockResolvedValue(mockApps as never);
```

**What to Mock:**
- External dependencies (file system, network, child processes)
- Database operations
- SSH connections
- Command execution

**What NOT to Mock:**
- Business logic functions under test
- Simple data transformations
- Pure functions

## Fixtures and Factories

**Test Data:**
```typescript
const mockApps = [
  { name: "test-app-1", ... },
  { name: "test-app-2", ... },
] as const;
```

**Location:**
- Defined inline in test files
- No centralized fixtures directory

## Coverage

**Requirements:** No enforced target, but good coverage maintained

**View Coverage:**
```bash
bun run test:coverage
# Output in coverage/ directory
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, class methods
- Approach: Mock all external dependencies
- Location: `server/lib/*.test.ts`, `client/src/**/*.test.tsx`

**Integration Tests:**
- Scope: HTTP endpoints with supertest
- Approach: Test Express app with real middleware
- Location: `server/index.test.ts`

**E2E Tests:**
- Not used (no Playwright/Cypress)

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

**Error Testing:**
```typescript
it("should return error on failure", async () => {
  vi.mocked(executeCommand).mockResolvedValue({
    exitCode: 1,
    stderr: "Error message",
  });

  const response = await request(app).get("/api/apps");
  expect(response.status).toBe(500);
});
```

---

*Testing analysis: 2026-03-02*
