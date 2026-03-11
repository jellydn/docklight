# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Runner:**
- Vitest 4.0.0 (both server and client)
- Config: `server/vitest.config.ts`, `client/vite.config.ts`

**Assertion Library:**
- Vitest built-in assertions (based on Chai)
- @testing-library/jest-dom for DOM assertions (client)

**Run Commands:**
```bash
just test                # Run all tests
just server-test          # Run server tests
just client-test          # Run client tests
cd server && bun run test:watch     # Watch mode
cd client && bun run test:coverage  # Coverage
```

## Test File Organization

**Location:**
- Co-located with source: `app.test.ts` next to `app.ts`
- Server: `server/lib/*.test.ts`, `server/routes/*.test.ts`
- Client: `client/src/pages/*.test.tsx`, `client/src/components/*.test.tsx`

**Naming:**
- Source: `<module>.ts` → Test: `<module>.test.ts`
- Component: `<Component>.tsx` → Test: `<Component>.test.tsx`

**Structure:**
```
server/
  lib/
    apps.ts
    apps.test.ts
    executor.ts
    executor.test.ts
client/src/
  pages/
    Apps.tsx
    Apps.test.tsx
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

  it("should do something when condition is met", async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await functionName(input);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

**Patterns:**
- Setup: `beforeEach()` to reset mocks before each test
- Arrange-Act-Assert structure for clarity
- Descriptive test names: "should [do something] when [condition]"

## Mocking

**Framework:** Vitest (`vi`)

**Patterns:**
```typescript
// Mock a module
vi.mock("./lib/executor.js", () => ({
  executeCommand: vi.fn(),
}));

// Get typed mock
const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

// Setup mock return value
mockExecuteCommand.mockResolvedValue({
  command: "dokku apps:list",
  exitCode: 0,
  stdout: "my-app",
  stderr: "",
});

// Reset mocks
beforeEach(() => {
  vi.clearAllMocks();
});
```

**What to Mock:**
- External dependencies (SSH, file system, HTTP)
- Module imports (`executeCommand`, database queries)

**What NOT to Mock:**
- Pure functions and utilities
- Parsing logic

## Fixtures and Factories

**Test Data:**
- Located in `server/test-data/`
- Files like `apps-list.txt`, `ps-report.txt` for CLI output fixtures
- Used via `fs.readFileSync()` in tests

**Location:**
- `server/test-data/` directory contains Dokku command output fixtures

## Coverage

**Requirements:** No enforced target, but good coverage maintained

**View Coverage:**
```bash
cd server && bun run test:coverage
cd client && bun run test:coverage
```

**Coverage tool:** @vitest/coverage-v8 (c8/v8 based)

## Test Types

**Unit Tests:**
- Focus: Individual functions and modules
- Scope: Pure functions, CLI output parsing, validation
- Mock external dependencies

**Integration Tests:**
- Focus: API endpoints with Supertest (server)
- Scope: HTTP request/response handling, authentication middleware

**E2E Tests:**
- Framework: Playwright
- Location: `client/playwright.config.ts`
- Commands: `just client-e2e`, `just client-e2e-ui`
- Scope: Full user flows through the UI

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toEqual(expected);
});
```

**Error Testing:**
```typescript
it("should return error when command fails", async () => {
  mockExecuteCommand.mockResolvedValue({
    exitCode: 1,
    stderr: "Error message",
  });

  const result = await functionUnderTest();
  expect(result).toEqual({
    error: "Failed to ...",
    exitCode: 1,
    stderr: "Error message",
  });
});
```

**Component Testing (Client):**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("MyComponent", () => {
  it("should render text", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

---

*Testing analysis: 2026-03-11*
