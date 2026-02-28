# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest 2.x
- Config: `server/vitest.config.ts`

**Assertion Library:**
- Built-in Vitest assertions (Chai-like)

**Run Commands:**
```bash
bun test              # Run all tests
bun run test:watch    # Watch mode
bun run test:coverage # Coverage report
```

## Test File Organization

**Location:**
- Co-located with source files: `lib/*.test.ts`
- Root-level integration test: `index.test.ts`

**Naming:**
- Source file + `.test.ts` suffix: `apps.ts` → `apps.test.ts`

**Structure:**
```
server/
├── lib/
│   ├── apps.ts
│   ├── apps.test.ts
│   ├── databases.ts
│   ├── databases.test.ts
│   └── ...
├── index.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("functionName", () => {
  beforeEach(() => {
    // Setup
  });

  it("should do something specific", () => {
    // Arrange
    const input = "...";

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- Setup: `beforeEach` for shared setup
- Teardown: Not commonly used ( Vitest auto-cleanup)
- Assertion: `expect(actual).op(expected)`

## Mocking

**Framework:** Vitest vi

**Patterns:**
```typescript
// Mock external module
vi.mock("../lib/executor", () => ({
  executeCommand: vi.fn().mockResolvedValue({
    exitCode: 0,
    stdout: "mocked output",
    stderr: "",
  }),
}));

// Mock function
const mockFn = vi.fn().mockReturnValue("value");
expect(mockFn).toHaveBeenCalledWith("arg");
```

**What to Mock:**
- SSH executor (`server/lib/executor.ts`)
- Database operations
- External API calls

**What NOT to Mock:**
- Business logic functions under test
- Data transformation utilities

## Fixtures and Factories

**Test Data:**
- Inline in tests (no separate fixture files)
- Example:
```typescript
const mockApp = {
  name: "test-app",
  status: "running",
  domains: ["example.com"],
};
```

**Location:**
- Co-located with tests (no shared fixture directory)

## Coverage

**Requirements:** None enforced (coverage tracked but no threshold)

**View Coverage:**
```bash
bun run test:coverage
```

**Provider:** v8 (via @vitest/coverage-v8)

**Reporters:** text, json, html

## Test Types

**Unit Tests:**
- Focus: Individual functions in `lib/*.test.ts`
- Approach: Mock dependencies, test business logic
- Example: `apps.test.ts` tests list(), restart(), rebuild()

**Integration Tests:**
- Focus: API endpoints in `index.test.ts`
- Approach: Supertest for HTTP assertions, mock executor
- Example: Test GET /api/apps returns 200 with app list

**E2E Tests:**
- Framework: Custom browser automation (`.agents/skills/dev-browser/`)
- Scope: Full user flows via Playwright
- Location: Separate skill, not in test directory

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

**Error Testing:**
```typescript
it("should return error on failure", async () => {
  vi.mocked(executeCommand).mockResolvedValue({
    exitCode: 1,
    stderr: "error message",
  });
  const result = await functionUnderTest();
  expect(result.exitCode).toBe(1);
});
```

---

*Testing analysis: 2026-02-28*
