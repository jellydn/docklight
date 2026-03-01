# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**
- kebab-case (e.g., `command-executor.ts`, `rate-limiter.ts`, `web-socket.ts`)
- Test files: `*.test.ts` co-located with source (e.g., `apps.test.ts` alongside `apps.ts`)

**Functions:**
- camelCase (e.g., `getApps`, `isValidAppName`, `executeCommand`, `buildRuntimeCommand`)
- Private/internal functions also use camelCase (e.g., `parseStatus`, `fetchAppDetails`)

**Variables:**
- camelCase (e.g., `mockExecuteCommand`, `exitCode`, `stderr`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `UNKNOWN_ERROR`, `IDLE_TIMEOUT_MS`)
- Regular expression patterns stored in constants (e.g., `INVALID_NAME_ERROR`)

**Types:**
- `interface` for object shapes (e.g., `App`, `AppDetail`, `CommandResult`)
- `type` for unions and primitives (e.g., `UserRole`)
- PascalCase for type names (e.g., `JWTPayload`, `ExecuteCommandOptions`)

## Code Style

**Formatting:**
- Tool: Biome
- Key settings:
  - Indent style: tabs
  - Indent width: 2
  - Line width: 100
  - Quote style: double
  - Trailing commas: es5
  - Semicolons: always

**Linting:**
- Tool: Biome (recommended rules enabled)
- Key overrides:
  - `noExplicitAny`: off (both server/client)
  - `useImportType`: on
  - `noNonNullAssertion`: off (client only)
  - `noUnusedVariables`: warn (client only)
  - `useExhaustiveDependencies`: off (client only)

## Import Organization

**Order:**
1. External dependencies (e.g., `import { describe, it, expect } from "vitest"`)
2. Type-only imports from external (e.g., `import type { Request, Response } from "express"`)
3. Internal module imports (e.g., `import { executeCommand } from "./executor.js"`)
4. Type-only imports from internal (e.g., `import type { CommandResult } from "./executor.js"`)

**Path Aliases:**
- Server: `@/` points to `server/` (configured in `vitest.config.ts`)
- Client: `@/` points to `client/src/`

**Import Extensions:**
- Always use `.js` extension for relative imports (TypeScript requirement)
- Example: `import { apps } from "./apps.js"`

## Error Handling

**Patterns:**
- Async functions return error objects instead of throwing:
  ```typescript
  type ErrorResult = { error: string; command: string; exitCode: number; stderr: string };
  ```
- Use `try-catch` with type assertions for unknown errors
- Extract error messages via helper functions: `const err = error as { message?: string }`
- Return exit codes and stderr for CLI command results
- Never expose shell execution directly to clients (use allowlist)

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Import logger from `server/lib/logger.ts`
- Use methods: `logger.info()`, `logger.error()`, `logger.warn()`
- Log errors with context object: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware
- Warnings for missing env vars in production

## Comments

**When to Comment:**
- JSDoc for exported functions with `@description` tag
- Comments explaining complex regex patterns
- Comments for backward compatibility notes (e.g., "Legacy single-password login")
- Inline comments for non-obvious logic

**JSDoc/TSDoc:**
- Used for exported functions, especially with special behaviors
- `@description` tag commonly used
- Example:
  ```typescript
  /** @description Parses "user@host" or "user@host:port". Note: IPv6 not supported. */
  function parseTarget(target: string): { host: string; username: string; port: number } | null
  ```

## Function Design

**Size:**
- Prefer smaller, focused functions
- Extract parsing logic into separate functions (e.g., `parseStatus`, `parseDomains`)
- Helper functions for common operations (e.g., `withRuntimeHint`, `createValidationError`)

**Parameters:**
- Explicit types for all parameters
- Use options objects for multiple parameters (e.g., `ExecuteCommandOptions`)
- Destructure options in function signature when appropriate

**Return Values:**
- Explicit return types on exported functions
- Union types for error/success results
- Prefer `Result`-style error objects over throwing

## Module Design

**Exports:**
- Named exports for functions and types (default exports avoided)
- Group related exports (e.g., `requireAdmin`, `requireOperator` middleware)
- Type exports with `export type` or `export interface`

**Barrel Files:**
- Not commonly used; prefer direct imports
- Test files import directly from source files

## Security Conventions

**Command Execution:**
- All commands must pass through allowlist (`server/lib/allowlist.ts`)
- Never allow user input to directly execute shell commands
- Validate app names with regex: `/^[a-z0-9-]+$/`
- Return error objects for invalid input (exitCode 400)

**Authentication:**
- JWT-based session tokens
- HttpOnly, SameSite=strict cookies
- Secure flag in production only
- Multi-user and legacy single-password support

---

*Convention analysis: 2026-03-01*
