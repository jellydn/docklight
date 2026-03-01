# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Runner:**

- Vitest (latest)
- Config: `server/vitest.config.ts`
- Environment: node

**Assertion Library:**

- Vitest built-in assertions (expect)

**Run Commands:**

```bash
bun test                # Run all tests
bun run test:watch      # Watch mode
bun run test:coverage   # Run with coverage
vitest run lib/apps.test.ts        # Single test file
vitest run -t "should fetch app"  # Single test by name
```

## Test File Organization

**Location:**

- Co-located with source files in `server/lib/`
- Test file named `*.test.ts` alongside source `*.ts`

**Naming:**

- Source: `apps.ts` → Test: `apps.test.ts`
- Source: `executor.ts` → Test: `executor.test.ts`

**Structure:**

```
server/lib/
  apps.ts
  apps.test.ts
  auth.ts
  auth.test.ts
  executor.ts
  executor.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { functionUnderTest } from "./module.js";
import { dependency } from "./dependency.js";

vi.mock("./dependency.js", () => ({
  dependency: vi.fn(),
}));

describe("functionUnderTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something specific", () => {
    // Arrange
    mockDependency.mockReturnValue("test");

    // Act
    const result = functionUnderTest();

    // Assert
    expect(result).toBe("expected");
  });
});
```

**Patterns:**

- Setup: `beforeEach` clears all mocks
- Teardown: `afterEach` used for environment cleanup when needed
- Assertion: Vitest `expect()` with matchers like `toBe()`, `toEqual()`, `toHaveBeenCalled()`

## Mocking

**Framework:** Vitest (vi)

**Patterns:**

```typescript
// Mock module before imports
vi.mock("./executor.js", () => ({
  executeCommand: vi.fn(),
}));

// Cast to typed mock
const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

// Mock implementation
mockExecuteCommand.mockResolvedValue({
  command: "dokku apps:list",
  exitCode: 0,
  stdout: "my-app",
  stderr: "",
});

// Multiple calls
mockExecuteCommand
  .mockResolvedValueOnce({
    /* first call */
  })
  .mockResolvedValueOnce({
    /* second call */
  });
```

**What to Mock:**

- External dependencies (executors, databases, loggers)
- I/O operations (file system, network)
- Modules that would have side effects

**What NOT to Mock:**

- Pure functions and utilities
- Business logic under test
- Simple data transformations

## Fixtures and Factories

**Test Data:**

```typescript
// Helper functions for creating test data
function makeExecResult(stdout: string, stderr: string, code: number) {
  return { stdout, stderr, code, signal: null };
}

// Inline test data
const validNames = ["my-app", "app123", "test-app-v1"];
```

**Location:**

- Test data defined within test files
- Helper functions at top of test file
- No separate fixtures directory

## Coverage

**Requirements:** None enforced

**View Coverage:**

```bash
bun run test:coverage
```

**Coverage Config:**

- Provider: v8
- Reporters: text, json, html
- Include: `lib/**/*.ts`, `*.ts`
- Exclude: `node_modules/`, `dist/`, `**/*.test.ts`

## Test Types

**Unit Tests:**

- Test individual functions in isolation
- Mock all external dependencies
- Focus on lib/ modules (apps, auth, executor, etc.)

**Integration Tests:**

- Test module interactions
- Some real dependencies allowed
- Example: `executor.test.ts` tests SSH pool integration

**E2E Tests:**

- Not used

## Common Patterns

**Async Testing:**

```typescript
it("should handle async operations", async () => {
  mockExecuteCommand.mockResolvedValue({
    /* ... */
  });
  const result = await getApps();
  expect(result).toEqual([]);
});
```

**Error Testing:**

```typescript
it("should return error on failure", async () => {
  mockExecuteCommand.mockResolvedValue({
    exitCode: 1,
    stderr: "App not found",
  });
  const result = await getAppDetail("nonexistent");
  expect(result).toEqual({
    error: "Failed to get app details",
    exitCode: 1,
    stderr: "App not found",
  });
});
```

**Environment Mocking:**

```typescript
const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
});

afterEach(() => {
  process.env = OLD_ENV;
});
```

**Testing Express Middleware:**

```typescript
it("should reject unauthorized requests", () => {
  const req = { cookies: {} } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const next = vi.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
```

---

_Testing analysis: 2026-03-01_
