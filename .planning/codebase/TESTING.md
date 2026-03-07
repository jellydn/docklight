# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:**
- Vitest 4.0.0
- Config: `server/vitest.config.ts` (server), `client/vitest.config.ts` (client)

**Assertion Library:**
- Vitest built-in assertions (Chai-based)
- @testing-library/jest-dom 6.9.1 for DOM matchers in client components

**Run Commands:**
```bash
just server-test       # Run server tests
just client-test       # Run client tests
just test              # Run all tests
just server-test:watch # Server watch mode
just client-test:watch # Client watch mode
bun run test:coverage  # Run with coverage
```

## Test File Organization

**Location:**
- Co-located with source files

**Naming:**
- `*.test.ts` for server files
- `*.test.tsx` for client components

**Structure:**
```
server/
├── lib/
│   ├── apps.ts
│   ├── apps.test.ts
│   └── executor.test.ts
├── routes/
│   ├── apps.ts
│   └── apps.test.ts
└── index.test.ts

client/src/
├── components/
│   ├── AppLayout.tsx
│   └── AppLayout.test.tsx
└── pages/
    ├── Dashboard.tsx
    └── Dashboard.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("functionName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", async () => {
    // Arrange
    const input = "test";

    // Act
    const result = await functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- Setup: Reset mocks in `beforeEach`
- Teardown: Vitest handles cleanup automatically
- Assertion: `expect()` matchers

## Mocking

**Framework:** Vitest `vi`

**Patterns:**
```typescript
// Mock external modules
vi.mock("./executor.js", () => ({
  executeCommand: vi.fn(),
}));

// Access mocked function
const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

// Set return value
mockExecuteCommand.mockResolvedValue({
  command: "test",
  exitCode: 0,
  stdout: "output",
  stderr: "",
});

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

**What to Mock:**
- External dependencies (SSH execution, filesystem)
- Module imports (`./executor.js`, database calls)

**What NOT to Mock:**
- Business logic functions (test the implementation)
- Pure functions

## Fixtures and Factories

**Test Data:**
```typescript
// Typical mock data pattern
const mockApps = [
  { name: "app1", status: "running", domains: ["app1.example.com"] },
  { name: "app2", status: "stopped", domains: [] },
];

// Mock response
mockExecuteCommand.mockResolvedValueOnce({
  command: "dokku apps:list",
  exitCode: 0,
  stdout: "app1\napp2",
  stderr: "",
});
```

**Location:**
- Inline in test files (no separate fixtures directory)

## Coverage

**Requirements:** No enforced requirements (quality gate)

**View Coverage:**
```bash
bun run test:coverage  # Generate coverage reports for server and client
```

- Provider: v8 (Vitest built-in)
- Reporters: text, json (server), html (both)
- Server coverage: includes `lib/**/*.ts`, `*.ts`, excludes `**/*.test.ts`
- Client coverage: default settings

## Test Types

**Unit Tests:**
- Server business logic (`server/lib/*.test.ts`)
- Client components and hooks (`client/src/**/*.test.tsx`)
- Fast, isolated, use mocks

**Integration Tests:**
- API routes (`server/routes/*.test.ts`)
- Use supertest for HTTP endpoint testing
- Test request/response cycles, authentication, error handling

**E2E Tests:**
- Framework: Playwright 1.58.2
- Config: `client/playwright.config.ts`
- Run: `bun run test:e2e`, `bun run test:e2e:ui`
- Test complete user workflows

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  mockExecuteCommand.mockResolvedValue(mockResult);
  const result = await getApps();
  expect(result).toEqual(expected);
});
```

**Error Testing:**
```typescript
it("should return error on failure", async () => {
  mockExecuteCommand.mockResolvedValue({
    command: "test",
    exitCode: 1,
    stdout: "",
    stderr: "Error message",
  });

  const result = await functionUnderTest();
  expect(result).toHaveProperty("error");
});
```

**Component Testing (Client):**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("Component", () => {
  it("should render", () => {
    render(<Component />);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
```

---

*Testing analysis: 2026-03-08*
