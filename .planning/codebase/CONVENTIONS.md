# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- kebab-case for all files: `command-executor.ts`, `user-auth.tsx`
- `*.test.ts` for server unit tests
- `*.test.tsx` for client component tests

**Functions:**
- camelCase: `getData`, `isActive`, `fetchApps`

**Variables:**
- camelCase for local variables: `const sshUser = ...`
- SCREAMING_SNAKE_CASE for constants: `MAX_RETRIES`, `CACHE_TTL`

**Types:**
- PascalCase for interfaces/types: `CommandResult`, `ExecuteCommandOptions`
- `interface` for object shapes
- `type` for unions and primitives

## Code Style

**Formatting:**
- Tool: Biome 2.4.4
- Config: `biome.json` (same for server and client)
- Indent: Tabs (displayed as 2 spaces)
- Line width: 100 characters
- Quotes: Double quotes for strings
- Semicolons: Always
- Trailing commas: ES5 style

**Linting:**
- Tool: Biome 2.4.4 (built-in linter)
- Recommended rules enabled
- `useImportType`: Enforces type-only imports with `import type`
- `noExplicitAny`: Disabled (any allowed with type assertions)
- `noTemplateCurlyInString`: Disabled (allows template strings)

## Import Organization

**Order:**
1. Vitest globals (`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`)
2. External dependencies (express, pino, react, etc.)
3. Internal dependencies (lib imports)
4. Type-only imports (`import type`)

**Path Aliases:**
- Client: `@/` points to `client/src/*`
- Server: No path alias configured, use relative imports

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import { cn } from "@/lib/utils"; // Client only
```

## Error Handling

**Patterns:**
- Try-catch for async operations
- Return `{ exitCode, stderr, stdout, command }` for shell commands
- Never throw errors for expected failures (e.g., command execution errors)
- Type assertions for caught errors: `const err = error as { message?: string }`

```typescript
try {
  const result = await execAsync(cmd, { timeout });
  return { command: cmd, exitCode: 0, stdout: result.stdout.trim(), stderr: "" };
} catch (error: unknown) {
  const err = error as { code?: number; stderr?: string; message?: string };
  return { command: cmd, exitCode: err.code || 1, stdout: "", stderr: err.stderr || err.message || "" };
}
```

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Location: `server/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware
- Log level controlled by `LOG_LEVEL` env var (default: "info")
- Client logging via Pino (same pattern as server)

## Comments

**When to Comment:**
- Code is self-documenting; comments used sparingly
- Comments explain "why", not "what"
- JSDoc used for exported functions with complex signatures

**JSDoc/TSDoc:**
- Minimal usage; TypeScript types provide documentation
- Used for complex public APIs

## Function Design

**Size:** No strict limit; prefer focused functions under 50 lines

**Parameters:**
- Explicit types for all parameters
- Options object for multiple parameters: `{ options?: ExecuteCommandOptions }`

**Return Values:**
- Explicit return types on all exported functions
- Union types for error handling: `T | CommandResult`

## Module Design

**Exports:**
- Named exports: `export function getData()`
- Re-exports via barrel files: `export * from "./module.js"`

**Barrel Files:**
- Used in `server/routes/index.ts` for route aggregation
- Used for grouping related utilities

---

*Convention analysis: 2026-03-02*
