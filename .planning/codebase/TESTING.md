# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Runner:**
- Vitest 4.0.x (server and client)
- Config: `server/vitest.config.ts`, `client/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions
- @testing-library/jest-dom for DOM assertions

**Run Commands:**
```bash
just test              # Run all tests
cd server && bun run test    # Server tests only
cd client && bun run test    # Client tests only
bun run test:e2e       # E2E tests only
vitest                 # Watch mode
vitest run             # Run without watch
```

## Test File Organization

**Location:**
- Co-located with source files (not in separate `__tests__` directory)

**Naming:**
- Same name as source file with `.test.ts` or `.test.tsx` suffix
- Example: `apps.ts` → `apps.test.ts`

**Structure:**
```
server/lib/
├── apps.ts
├── apps.test.ts
├── databases.ts
└── databases.test.ts

client/src/pages/
├── Apps.tsx
├── Apps.test.tsx
├── Dashboard.tsx
└── Dashboard.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getApps } from "./apps.js";

vi.mock("./executor.js", () => ({ executeCommand: vi.fn() }));

describe("getApps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of apps", async () => {
    vi.mocked(executeCommand).mockResolvedValue({
      command: "dokku apps:list",
      exitCode: 0,
      stdout: "myapp\nanother-app",
      stderr: "",
    });

    const result = await getApps();
    expect(result).toEqual([
      expect.objectContaining({ name: "myapp" }),
    ]);
  });
});
```

**Patterns:**
- Setup: `beforeEach()` to reset mocks
- Act-Assert pattern: Call function, then assert result
- Mock external dependencies with `vi.mock()`
- Use `vi.mocked()` for type-safe mock access

## Mocking

**Framework:** Vitest `vi.mock()`

**Patterns:**
```typescript
// Mock at module level
vi.mock("./executor.js", () => ({ executeCommand: vi.fn() }));

// Type-safe mock access
vi.mocked(executeCommand).mockResolvedValue({ ... });

// Mock implementation
vi.mocked(executeCommand).mockImplementation(async (cmd) => { ... });

// Reset mocks
vi.clearAllMocks();
```

**What to Mock:**
- External API calls (executeCommand, SSH)
- Database operations
- File system operations
- Date/time for deterministic tests

**What NOT to Mock:**
- Business logic functions
- Data transformations
- Pure functions

## Fixtures and Factories

**Test Data:**
```typescript
// In test files, define inline
const mockApp = {
  name: "myapp",
  status: "running" as const,
  domains: ["myapp.example.com"],
};

// Use test-data directory for large fixtures
// server/lib/test-data/ contains sample Dokku outputs
```

**Location:**
- Inline for simple fixtures
- `server/lib/test-data/` for large/sample outputs

## Coverage

**Requirements:** No enforced target, but aim for high coverage

**View Coverage:**
```bash
vitest run --coverage
```

**Tool:** @vitest/coverage-v8

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules
- Approach: Mock all external dependencies
- Focus: Business logic and data transformations

**Integration Tests:**
- Scope: API endpoints and route handlers
- Approach: Use supertest for HTTP, mock only SSH/DB
- Focus: Request/response handling, authentication
- Example: `server/index.test.ts` (full server tests)

**E2E Tests:**
- Framework: Playwright 1.58.x
- Scope: Critical user flows across the full stack
- Approach: Real browser, real server, mock Dokku CLI
- Config: `client/playwright.config.ts`
- Location: `client/e2e/*.spec.ts`

```bash
# Run E2E tests
cd client && bun run test:e2e
cd client && bun run test:e2e:ui  # With UI
```

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operations", async () => {
  const result = await getApps();
  expect(result).toHaveLength(2);
});
```

**Error Testing:**
```typescript
it("should return error on failure", async () => {
  vi.mocked(executeCommand).mockResolvedValue({
    exitCode: 1,
    stderr: "Command failed",
  });

  const result = await getApps();
  expect(result).toHaveProperty("error");
});
```

**React Component Testing:**
```typescript
import { render, screen } from "@testing-library/react";
import { Apps } from "./Apps";

vi.mock("../lib/api.js", () => ({ getApps: vi.fn() }));

it("should display apps", async () => {
  vi.mocked(getApps).mockResolvedValue([
    { name: "myapp", status: "running", domains: [] },
  ]);

  render(<Apps />);
  await expect(screen.findByText("myapp")).resolves.toBeInTheDocument();
});
```

---

*Testing analysis: 2026-03-04*
