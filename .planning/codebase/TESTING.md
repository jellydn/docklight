# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest (version 4.0.0)
- Config: `/Users/huynhdung/src/tries/2026-02-28-jellydn-docklight-pr41/server/vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions (expect)

**Run Commands:**
```bash
bun run test                 # Run all tests
bun run test:watch          # Watch mode
bun run test:coverage        # Run with coverage
vitest run lib/*.test.ts     # Single test file
vitest run -t "test name"    # Single test by name
```

## Test File Organization

**Location:**
- Co-located with source files (*.test.ts in same directory)
- Example: `server/lib/apps.test.ts` for `server/lib/apps.ts`

**Naming:**
- Pattern: `{filename}.test.ts`
- Example: `dokku.test.ts`, `executor.test.ts`, `apps.test.ts`

**Structure:**
```
lib/
├── apps.ts
├── apps.test.ts
├── dokku.ts
├── dokku.test.ts
├── executor.ts
├── executor.test.ts
└── ...
```

## Test Structure

**Suite Organization:**
```typescript
describe("FunctionName", () => {
  describe("Subcategory", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle specific scenario", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Patterns:**
- **Setup**: beforeEach() calls vi.clearAllMocks() to reset mocks between tests
- **Teardown**: afterEach() not used for cleanup (except for timing-related tests)
- **Assertion**: Use expect().toBe(), expect().toEqual(), expect().resolves, etc.

## Mocking

**Framework:** Vitest vi module

**Patterns:**
```typescript
vi.mock("./executor.js", () => ({
  executeCommand: vi.fn(),
}));

const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

vi.mocked(mockExecuteCommand).mockResolvedValue({
  command: "dokku apps:list",
  exitCode: 0,
  stdout: "my-app\nanother-app",
  stderr: "",
});
```

**What to Mock:**
- External dependencies (SSH, file system, database, process execution)
- API calls to other modules
- Dependencies that require complex setup or have side effects

**What NOT to Mock:**
- Pure functions (no external dependencies)
- Simple utility functions
- Helper functions without I/O
- Pure logic that can be tested directly

## Fixtures and Factories

**Test Data:**
```typescript
const mockExecResult = { stdout: "app1\napp2", stderr: "", code: 0 };

const mockApps: App[] = [
  {
    name: "my-app",
    status: "running",
    domains: ["my-app.example.com"],
    lastDeployTime: "2024-01-15T10:30:00Z",
  },
];

function makeExecResult(
  stdout: string,
  stderr: string,
  code: number
): CommandResult {
  return { stdout, stderr, code, signal: null };
}
```

**Location:**
- Defined inline near the tests that use them
- Factory functions defined as helper functions in the test file

## Coverage

**Requirements:** No explicit coverage requirements documented

**View Coverage:**
```bash
bun run test:coverage    # Generates coverage report in coverage/ directory
```

**Configured Coverage:**
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  include: ["lib/**/*.ts", "*.ts"],
  exclude: ["node_modules/", "dist/", "**/*.test.ts"],
}
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Mock external dependencies, test pure logic
- Example: `apps.test.ts` tests validation functions, parsers

**Integration Tests:**
- Scope: Module interactions, data flow
- Approach: Partially mock dependencies, test integration paths
- Example: `index.test.ts` tests API routes with mocked business logic

**E2E Tests:**
- Framework: Not used (no test suite for full user flows)

## Common Patterns

**Async Testing:**
```typescript
it("should return apps on success", async () => {
  mockExecuteCommand.mockResolvedValue({
    command: "dokku --quiet apps:list",
    exitCode: 0,
    stdout: "app1\napp2",
    stderr: "",
  });

  const result = await getApps();

  expect(result).toEqual(["app1", "app2"]);
});
```

**Error Testing:**
```typescript
it("should return error on command failure", async () => {
  mockExecuteCommand.mockResolvedValue({
    command: "dokku apps:list",
    exitCode: 1,
    stdout: "",
    stderr: "Permission denied",
  });

  const result = await getApps();

  expect(result).toEqual({
    error: "Failed to list apps",
    command: "dokku --quiet apps:list",
    exitCode: 1,
    stderr: "Permission denied",
  });
});
```

**Mock Setup Pattern:**
```typescript
const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...OLD_ENV, DOCKLIGHT_DOKKU_SSH_TARGET: "dokku@server" };
  delete process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET;
  delete process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH;
  mockSshInstance.connect.mockResolvedValue(undefined);
  mockSshInstance.isConnected.mockReturnValue(true);
  sshPool.closeAll();
});

afterEach(() => {
  process.env = OLD_ENV;
  sshPool.closeAll();
});
```

**Timing Testing:**
```typescript
vi.useFakeTimers();

// Test with fake timers
vi.advanceTimersByTime(1000);

vi.useRealTimers();
```

---
*Testing analysis: 2026-02-28*
