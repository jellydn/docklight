# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- kebab-case (e.g., `command-executor.ts`, `dokku.ts`)

**Functions:**
- camelCase (e.g., `getApps`, `executeCommand`, `isValidAppName`)

**Variables:**
- camelCase (e.g., `mockExecuteCommand`, `commandResult`)

**Types/Interfaces:**
- PascalCase (e.g., `CommandResult`, `SSHPool`, `AppDetail`)

**Constants:**
- SCREAMING_SNAKE_CASE (e.g., `ALLOWED_COMMANDS`, `WINDOW_MS`, `IDLE_TIMEOUT_MS`)

## Code Style

**Formatting:**
- Tool: Biome
- Settings: Tabs (2 spaces), Strings: double quotes, Trailing commas: es5, Line width: 100, Semicolons: always

**Linting:**
- Tool: Biome
- Rules: Recommended + suspicious.noExplicitAny(off), style.useImportType(on), style.useNodejsImportProtocol(off), correctness.useParseIntRadix(off)

## Import Organization

**Order:**
1. External dependencies (express, pino, node-ssh, etc.)
2. Internal utilities (logger, executor, etc.)
3. Types from other modules

**Path Aliases:**
- `@/` points to current directory (server/)
- Used for import convenience: `import { logger } from "@/lib/logger.js";`

## Error Handling

**Patterns:**
- Use try-catch for async operations
- Return error objects with exitCode, stderr, and context rather than throwing
- Wrap errors with context: `logger.error({ err }, "Error message")`
- Validation errors return 400 status with descriptive stderr messages

```typescript
try {
  const result = await executeCommand(cmd);
  return { ...result, exitCode: 0 };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return { exitCode: err.code || 1, stderr: err.message };
}
```

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Server uses `logger` from `server/lib/logger.ts`
- Log errors with context: `logger.error({ err, command }, "Error message")`
- HTTP requests automatically logged via pino-http middleware
- Console transport in development, no transport in production
- Log levels: info, warn, error

```typescript
logger.error(
  {
    err,
    command,
    path: req.path,
  },
  "Error message"
);
```

## Comments

**When to Comment:**
- Document complex logic (e.g., command builders, SSH pool behavior)
- Document public API with JSDoc tags (@description, @param, @returns)
- Explain non-obvious error handling strategies
- Document security-critical code (command allowlists, input validation)

**JSDoc/TSDoc:**
- Use @description for function descriptions
- Use @param for parameter documentation
- Use @returns for return value documentation
- Use @description for class/interface purposes
- Comments use JSDoc format: `/** @description ... */`

## Function Design

**Size:** Functions should be small and focused (typically < 50 lines)
- Extract complex logic into helper functions
- Keep single responsibility

**Parameters:**
- Explicit types for all parameters
- Use interfaces for complex parameter objects
- Optional parameters with default values where appropriate

**Return Values:**
- Simple values: direct return
- Error scenarios: return error object with exitCode, stderr, and context
- Async operations: Promise-based returns
- Public functions often return union types of success/error patterns

## Module Design

**Exports:**
- Named exports for functions and constants
- Default export for main entry point (server/index.ts)
- Barrel files: Not used in this codebase

**Structure:**
- lib/ directory contains reusable utilities
- Each module has one public API (exports in module-level scope)
- Type definitions co-located with their usage or in separate .d.ts files

**Testing:**
- Co-located test files (*.test.ts in same directory as source)
- No separate test directories for server

---
*Convention analysis: 2026-02-28*
