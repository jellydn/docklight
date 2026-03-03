# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- kebab-case for all files: `app-deployment.ts`, `create-user.ts`, `audit-filters.tsx`
- Test files share the same name with `.test.ts` or `.test.tsx` suffix

**Functions:**
- camelCase for function names: `getApps`, `executeCommand`, `isValidAppName`
- Async functions start with a verb: `fetchAppDetails`, `parseStatus`

**Variables:**
- camelCase for local variables: `appName`, `userId`, `exitCode`
- SCREAMING_SNAKE_CASE for constants: `INVALID_NAME_ERROR`, `MAX_RETRIES`

**Types:**
- PascalCase for interfaces and type aliases: `CommandResult`, `App`, `AppDetail`
- Use `interface` for object shapes, `type` for unions/primitives

## Code Style

**Formatting:**
- Tool: Biome (identical config in server and client)
- Key settings:
  - Indent: Tabs (displayed as 2 spaces)
  - Line width: 100 characters
  - Quotes: Double quotes
  - Semicolons: Always
  - Trailing commas: Multi-line only

**Linting:**
- Tool: Biome
- Key rules:
  - Remove unused variables (warn)
  - No explicit `any` types
  - Use `import type` for type-only imports

## Import Organization

**Order:**
1. External dependencies (npm packages)
2. Internal imports (relative paths)
3. Type-only imports (grouped separately if many)

**Path Aliases:**
- Client: `@/` → `client/src/`
- Server: Uses relative `./` paths

```typescript
// Example import order
import express from "express";
import type { Request, Response } from "express";
import { executeCommand } from "./lib/executor.js";
import type { CommandResult } from "./lib/executor.js";
```

## Error Handling

**Patterns:**
- Never throw errors for expected failures
- Return typed error objects: `{ error: string; exitCode: number; command: string }`
- Use type assertions for caught errors: `error as { message?: string }`
- Include helpful error messages with context

```typescript
// Expected failure pattern
if (!isValidAppName(name)) {
  return {
    error: "Invalid app name",
    command: "",
    exitCode: 400,
    stderr: "App name must contain only lowercase letters, numbers, and hyphens",
  };
}

// Unexpected error pattern
try {
  return await executeCommand(cmd);
} catch (error: unknown) {
  const err = error as { message?: string };
  return {
    error: err.message || "Unknown error",
    command: cmd,
    exitCode: 1,
  };
}
```

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Server: Use `logger` from `server/lib/logger.ts`
- Client: Use `logger` from `client/src/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- Use appropriate log levels: `error`, `warn`, `info`, `debug`

## Comments

**When to Comment:**
- Minimal comments - code should be self-documenting
- Comments only for "why" something is done, not "what"
- JSDoc/TSDoc rarely used (code is self-explanatory)

**JSDoc/TSDoc:**
- Not commonly used
- Code relies on TypeScript types for documentation

## Function Design

**Size:** Prefer smaller, focused functions (< 50 lines)

**Parameters:**
- Explicit types for all parameters
- Use options objects for many parameters
- Destructure options in function signature

**Return Values:**
- Always specify return type
- Return union types for error handling: `Result | { error: string }`
- Use `Promise<T>` for async functions

```typescript
// Example function signature
export async function getApps(
  userId?: string
): Promise<App[] | { error: string; command: string; exitCode: number; stderr: string }> {
  // implementation
}
```

## Module Design

**Exports:**
- Named exports preferred: `export function getApps() {}`
- Default exports used for React components: `export default function App() {}`

**Barrel Files:**
- `server/routes/index.ts`: Aggregates all route exports
- `client/src/pages/AppDetail/index.tsx`: Exports AppDetail component

---

*Convention analysis: 2026-03-04*
