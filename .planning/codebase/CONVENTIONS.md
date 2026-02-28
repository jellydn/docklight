# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- kebab-case for regular files: `command-executor.ts`, `api-client.ts`
- Test files: `.test.ts` (server) or `.test.tsx` (client) suffix

**Functions:**
- camelCase: `getApps`, `restartApp`, `isValidAppName`, `executeCommand`

**Variables:**
- camelCase: `const appName`, `const exitCode`
- Constants: SCREAMING_SNAKE_CASE for module-level exports

**Types:**
- PascalCase for interfaces/types: `CommandResult`, `App`, `AppDetail`
- Type unions: `type AllowedCommand = typeof ALLOWED_COMMANDS[number]`

## Code Style

**Formatting:**
- Tool: Biome ^2.4.4
- Config: `server/biome.json` (shared)
- Indent: Tabs (displayed as 2 spaces)
- Line width: 100 characters
- Quotes: Double quotes
- Semicolons: Always
- Trailing commas: ES5

**Linting:**
- Tool: Biome linter (recommended rules enabled)
- Key rules:
  - `useImportType`: Enforced (type-only imports)
  - `noExplicitAny`: Off
  - `useParseIntRadix`: Off

## Import Organization

**Order:**
1. External imports (from node_modules)
2. Internal imports (relative paths)
3. Type imports (using `import type`)

**Path Aliases:**
- Client: `@/` points to `client/src/` (configured in vite.config.ts)
- Server: `@/` points to `server/` (configured in vitest.config.ts)

```typescript
import express from "express"; // External
import { executeCommand } from "./lib/executor.js"; // Internal
import type { Request, Response } from "express"; // Type
import { apiFetch } from "@/lib/api"; // With alias (client)
```

**Note:** Relative imports use `.js` extension even for TypeScript files (ES module requirement).

## Error Handling

**Patterns:**
- Never throw errors across API boundaries
- Return error objects with `{ exitCode, stderr }` structure
- Use try-catch for shell command execution
- Validate inputs before executing commands

```typescript
try {
  const result = await execAsync(cmd, { timeout });
  return { ...result, exitCode: 0 };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return { exitCode: err.code || 1, stderr: err.message };
}
```

## Logging

**Framework:** Pino (structured JSON logging)

**Patterns:**
- Server: Import `logger` from `server/lib/logger.ts`
- Client: Import `logger` from `client/src/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware

## Comments

**When to Comment:**
- Explain non-obvious business logic
- Document command output parsing (Dokku output formats)
- Note security considerations
- JSDoc only for exported API functions

**JSDoc/TSDoc:**
- Minimal usage in this codebase
- Prefer self-documenting code with clear names

## Function Design

**Size:** Keep functions focused (typically < 50 lines)

**Parameters:**
- Use objects for multiple related parameters
- Destructure in function signature for clarity

**Return Values:**
- Always type return values explicitly
- Return consistent error object structure

## Module Design

**Exports:**
- Named exports for functions and utilities
- Default export rarely used

**Barrel Files:**
- Not currently used in this codebase
- Each module imports directly from source files

---

*Convention analysis: 2026-02-28*
