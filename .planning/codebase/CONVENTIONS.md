# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**
- kebab-case: `app-buildpacks.ts`, `use-streaming-action.ts`
- Test files: `<filename>.test.ts` or `<filename>.test.tsx`

**Functions:**
- camelCase: `getApps()`, `restartApp()`, `isValidAppName()`, `executeCommand()`
- Declare async functions using the `async` keyword: `async function getApp(name: string)`

**Variables:**
- camelCase: `appName`, `exitCode`, `stdout`, `stderr`
- Constants: SCREAMING_SNAKE_CASE: `ALLOWED_COMMANDS`, `IDLE_TIMEOUT_MS`

**Types:**
- PascalCase for interfaces/types: `App`, `AppDetail`, `CommandResult`
- Descriptive names: `UserRole`, `JWTPayload`, `ChecksReport`
- Use `type` for unions/primitives, `interface` for object shapes

## Code Style

**Formatting:**
- Biome 2.4.4 (all-in-one linter and formatter)
- Key settings:
  - Indent style: Tabs
  - Indent width: 2
  - Line width: 100
  - Quote style: Double quotes
  - Trailing commas: ES5
  - Semicolons: Always

**Linting:**
- Biome linter with recommended rules enabled
- Specific overrides:
  - `noExplicitAny`: off
  - `noTemplateCurlyInString`: off
  - `useImportType`: on
  - `useParseIntRadix`: off

**Commands:**
- `just format` - Format all code
- `just lint` - Lint all code
- `just server-format` / `just client-format` - Format specific project

## Import Organization

**Order:**
1. External dependencies (npm packages)
2. Internal modules (relative imports with `./`)
3. Type-only imports (using `import type`)

**Path Aliases:**
- Client: `@/` alias for `client/src/*` (configured in `client/tsconfig.json`)
- Server: Relative imports with `.js` extension (even for `.ts` files)

**Example:**
```typescript
// External dependencies
import express from "express";
import { cn } from "@/lib/utils"; // Client alias

// Internal modules
import { getData } from "./lib/db.js";

// Type-only imports
import type { Request, Response } from "express";
import type { Data } from "./lib/types.js";
```

## Error Handling

**Patterns:**
- Return error objects instead of throwing: `{error: string, command?: string, exitCode?: number}`
- Never throw for expected failures (command execution, parsing)
- Validate early and return error responses
- Type assertions for caught errors: `const err = error as {code?: number; message?: string}`

**Example:**
```typescript
try {
  const result = await execAsync(cmd, {timeout});
  return {command: cmd, exitCode: 0, stdout: result.stdout.trim(), stderr: result.stderr.trim()};
} catch (error: unknown) {
  const err = error as {code?: number; message?: string};
  return {command: cmd, exitCode: err.code || 1, stdout: "", stderr: err.message || ""};
}
```

## Logging

**Framework:** Pino (server), client-side logger (client)

**Patterns:**
- Server: Use `logger` from `server/lib/logger.ts`
- Log errors with context: `logger.error({err}, "Error message")`
- Log with appropriate levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

## Comments

**When to Comment:**
- Minimal comments - prefer self-documenting code
- JSDoc only for public APIs and complex functions
- No comments for obvious code

**JSDoc/TSDoc:**
- Used sparingly in `server/lib/auth.ts`, `server/lib/checks.ts`
- Focus on parameter types and return values

## Function Design

**Size:** Keep functions focused and under 50 lines when possible

**Parameters:**
- Use objects for multiple related parameters: `{userId, timeout, skipHistory}`
- Destructure parameters in function signature

**Return Values:**
- Consistent return types (success or error objects)
- Explicit return types for public functions

**Example:**
```typescript
async function executeCommand(
  command: string,
  timeout: number = 30000,
  options?: ExecuteCommandOptions
): Promise<CommandResult>
```

## Module Design

**Exports:**
- Named exports for functions: `export function getApps()`
- Type exports: `export type { App, AppDetail }`
- Barrel files: `server/routes/index.ts` exports all route registers

**Barrel Files:**
- `server/routes/index.ts`: Consolidates all route registration functions
- `client/src/pages/AppDetail/index.tsx`: Exports app detail component

---

*Convention analysis: 2026-03-11*
