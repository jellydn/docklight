# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest ^4.0.0
- Config: `server/vitest.config.ts`, `client/vitest.config.ts` (implied)

**Assertion Library:**
- Vitest's built-in expect (Chai-like)

**Run Commands:**
```bash
# Server
cd server
bun test                 # Run all tests
bun run test:watch       # Watch mode
bun run test:coverage    # Run with coverage

# Client
cd client
bun test                 # Run all tests
bun run test:watch       # Watch mode
bun run test:coverage    # Run with coverage
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)

**Naming:**
- `[filename].test.ts` for server tests
- `[filename].test.tsx` for client component tests

**Structure:**
```
server/
  lib/
    apps.ts
    apps.test.ts
    executor.ts
    executor.test.ts (implied)

client/src/
  components/
    AppLayout.tsx
    AppLayout.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("functionName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- Setup: Use `beforeEach` to clear mocks between tests
- Mocking: `vi.mock()` at module level for dependencies
- Assertions: Descriptive test names starting with "should"

## Mocking

**Framework:** Vitest's built-in `vi` mock functions

**Patterns:**
```typescript
// Mock module at top level
vi.mock("./executor.js", () => ({
  executeCommand: vi.fn(),
}));

// Get mock reference in tests
const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

// Mock return values
mockExecuteCommand.mockResolvedValue({
  command: "dokku apps:list",
  exitCode: 0,
  stdout: "my-app",
  stderr: "",
});
```

**What to Mock:**
- Shell command execution (`executeCommand`)
- External API calls (`apiFetch`)
- Database operations
- Logger

**What NOT to Mock:**
- Pure utility functions
- Data transformation logic

## Fixtures and Factories

**Test Data:**
- Created inline in each test
- No centralized fixture files

**Location:**
- Test data defined within test files

## Coverage

**Requirements:** None enforced (coverage used for visibility)

**View Coverage:**
```bash
bun run test:coverage    # Generates HTML report in coverage/
```

**Provider:** v8 (built-in Vitest coverage)

## Test Types

**Unit Tests:**
- Server lib functions: test business logic in isolation
- Mock shell execution
- Test error handling, validation, parsing

**Integration Tests:**
- API endpoint tests using Supertest (implied by devDependency)
- Test request/response flow through Express

**E2E Tests:**
- Framework: Browser automation (`.agents/skills/dev-browser/`)
- Snapshot testing for visual regression

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  mockExecuteCommand.mockResolvedValue(expectedResult);
  const result = await asyncFunction();
  expect(result).toEqual(expected);
});
```

**Error Testing:**
```typescript
it("should return error on failure", async () => {
  mockExecuteCommand.mockResolvedValue({
    exitCode: 1,
    stderr: "Error message",
  });
  const result = await functionUnderTest();
  expect(result).toEqual({
    error: "Failed operation",
    exitCode: 1,
    stderr: "Error message",
  });
});
```

**React Component Testing:**
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should render and respond to clicks", async () => {
  const user = userEvent.setup();
  render(<Component />);

  expect(screen.getByText("Button")).toBeInTheDocument();

  await user.click(screen.getByRole("button"));
  expect(mockFunction).toHaveBeenCalled();
});
```

---

*Testing analysis: 2026-02-28*
