# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- Vitest 4.0.0
- Config: `server/vitest.config.ts`, `client/vitest.config.ts`

**Assertion Library:**
- Built-in `expect` (Vitest)

**Run Commands:**
```bash
just test              # Run all tests
bun test              # Run all tests
bun test:watch        # Watch mode
bun test:coverage     # Run with coverage
vitest run -t "name"  # Run specific test
```

## Test File Organization

**Location:**
- Server: Co-located in `server/lib/*.test.ts`
- Client: Co-located in `client/src/pages/*.test.tsx` and `client/src/components/*.test.tsx`

**Naming:**
- Same name as source file with `.test.ts` or `.test.tsx` suffix
- Example: `cache.ts` → `cache.test.ts`

**Structure:**
```
server/lib/
├── cache.ts
├── cache.test.ts
├── executor.ts
├── executor.test.ts
└── ...

client/src/pages/
├── Apps.tsx
├── Apps.test.tsx
└── ...
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("module name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup
  });

  afterEach(() => {
    // Teardown
  });

  describe("specific feature", () => {
    it("should do something when condition", () => {
      // Arrange
      const input = "value";

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

**Patterns:**
- Setup: `beforeEach()` for test isolation
- Teardown: `afterEach()` for cleanup
- Assertion: `expect().toBe()`, `expect().toEqual()`, etc.
- Fake timers: `vi.useFakeTimers()`, `vi.advanceTimersByTime()`

## Mocking

**Framework:** Vitest `vi` module

**Patterns:**
```typescript
// Module-level mocking
vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

// Mock return values
vi.mocked(apiFetch).mockResolvedValue({ data: "value" });

// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Type-safe assertions
const mockFn = vi.mocked(apiFetch);
expect(mockFn).toHaveBeenCalledWith(expectedArgs);
```

**What to Mock:**
- External API calls (`apiFetch`)
- File system operations
- Child process execution
- Database queries in unit tests
- Logger calls

**What NOT to Mock:**
- Pure functions
- Business logic under test
- Simple data transformations

## Fixtures and Factories

**Test Data:**
```typescript
// Constants within describe blocks
const mockApps = [{ name: "app1", status: "running" }];
const mockUser = { username: "admin", role: "admin" };

// Helper functions for data creation
function createMockApp(overrides = {}) {
  return { name: "test-app", status: "running", ...overrides };
}
```

**Location:**
- Inline within test files (no separate fixtures directory)
- `server/test-data/` contains sample response JSON files for complex fixtures

## Coverage

**Requirements:** No enforced threshold, but good coverage maintained

**View Coverage:**
```bash
bun run test:coverage
```

**Current Coverage:**
- Server: ~13 test files covering core lib modules
- Client: ~9 test files covering pages and components

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules
- Approach: Mock external dependencies
- Location: `server/lib/*.test.ts`

**Integration Tests:**
- Scope: API endpoints and request flows
- Approach: Supertest for HTTP testing
- Location: `server/index.test.ts`

**E2E Tests:**
- Framework: Not used (manual testing recommended)

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  // Use async/await
  const result = await asyncFunction();
  expect(result).toBe("expected");

  // Mock promises
  vi.mocked(apiFetch).mockResolvedValue({ data: "value" });
});

it("should handle errors", async () => {
  vi.mocked(apiFetch).mockRejectedValue(new Error("API Error"));
  await expect(asyncFunction()).rejects.toThrow("API Error");
});
```

**Error Testing:**
```typescript
it("should handle invalid input", () => {
  expect(() => parseInput("")).toThrow();
});

it("should return error result", () => {
  const result = executeCommand("invalid");
  expect(result.exitCode).toBeGreaterThan(0);
  expect(result.stderr).toContain("error");
});
```

**React Component Testing:**
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should handle user interaction", async () => {
  const user = userEvent.setup();
  render(<Component />);

  const button = screen.getByRole("button");
  await user.click(button);

  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

---

*Testing analysis: 2026-03-02*
