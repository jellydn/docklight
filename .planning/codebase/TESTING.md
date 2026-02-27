# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Vitest `^2.1.0` configured in `.agents/skills/dev-browser/package.json`.
- Config: `.agents/skills/dev-browser/vitest.config.ts`.

**Assertion Library:**
- Vitest built-in assertions/globals (`globals: true`) in `.agents/skills/dev-browser/vitest.config.ts`.

**Run Commands:**
```bash
cd .agents/skills/dev-browser && bun test              # Run all tests
cd .agents/skills/dev-browser && bun run test:watch    # Watch mode
# Coverage command not configured in package scripts
```

## Test File Organization

**Location:**
- Expected location is skill-local source tree via `include: ["src/**/*.test.ts"]` in `.agents/skills/dev-browser/vitest.config.ts`.
- No committed `*.test.*` or `*.spec.*` files were found under `server/`, `client/`, or `.agents/skills/dev-browser/src/` in this snapshot.

**Naming:**
- Configured naming pattern is `*.test.ts` in `.agents/skills/dev-browser/vitest.config.ts`.

**Structure:**
```
.agents/skills/dev-browser/
  src/
    **/*.test.ts   # configured include pattern
```

## Test Structure

**Suite Organization:**
```typescript
// No committed test suites found in server/, client/, or .agents/skills/dev-browser/src/
```

**Patterns:**
- Setup pattern: not observable from committed test files.
- Teardown pattern: not observable from committed test files.
- Assertion pattern: not observable from committed test files.

## Mocking

**Framework:**
- Vitest is configured (`.agents/skills/dev-browser/vitest.config.ts`), but no committed mocks were found.

**Patterns:**
```typescript
// No committed mocking examples found in repository test files.
```

**What to Mock:**
- Not documented in committed test code; operationally, browser/extension boundaries are described in `.agents/skills/dev-browser/SKILL.md`.

**What NOT to Mock:**
- Not documented in committed test code.

## Fixtures and Factories

**Test Data:**
```typescript
// No committed fixtures/factories found.
```

**Location:**
- No fixture/factory directories or files were found in `server/`, `client/`, or `.agents/skills/dev-browser/src/`.

## Coverage

**Requirements:** None enforced in committed config/scripts.

**View Coverage:**
```bash
# No coverage script configured in `server/package.json`, `client/package.json`, or `.agents/skills/dev-browser/package.json`
```

## Test Types

**Unit Tests:**
- No committed unit test files found.

**Integration Tests:**
- No committed integration test files found.

**E2E Tests:**
- No committed E2E suite in this repository snapshot.
- Browser automation capability exists via `.agents/skills/dev-browser/` (`playwright` dependency in `.agents/skills/dev-browser/package.json`) but is not represented by committed test files.

## Common Patterns

**Async Testing:**
```typescript
// No committed async test examples found.
```

**Error Testing:**
```typescript
// No committed error-path test examples found.
```

---

*Testing analysis: 2026-02-27*
