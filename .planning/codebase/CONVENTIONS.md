# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- kebab-case for utilities and non-component files: `api.ts`, `logger.ts`, `executor.ts`
- PascalCase for React components: `AppLayout.tsx`, `CommandResult.tsx`, `ToastProvider.tsx`

**Functions:**
- camelCase: `fetchAppDetail()`, `handleLogout()`, `apiFetch()`
- Event handlers: `handle*` prefix (`handleSubmit`, `handleAction`)
- Async functions: `fetch*` prefix or verb (`getDatabasesByPlugin`)

**Variables:**
- camelCase: `sidebarOpen`, `configVars`, `lineCount`
- Boolean: `is/has` prefix or adjective (`loading`, `error`, `visible`)

**Types:**
- PascalCase for interfaces/types: `CommandResult`, `ServerHealth`, `Database`
- Union types: PascalCase with pipe: `"running" | "stopped"`

## Code Style

**Formatting:**
- Tool: Biome 2.4.x
- Key settings:
  - Indent: tabs (2 spaces visual)
  - Line width: 100
  - Quotes: double
  - Semicolons: always
  - Trailing commas: es5

**Linting:**
- Tool: Biome linter
- Key rules:
  - `recommended: true`
  - `suspicious.noExplicitAny: off` (allows `any` type)
  - `style.useImportType: on` (enforces type-only imports)
  - `correctness.useParseIntRadix: off` (allows parseInt without radix)

## Import Organization

**Order:**
1. External dependencies (react, express, etc.)
2. Type-only imports from external
3. Internal modules (relative paths)
4. Type-only imports from internal

```typescript
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { apiFetch } from "../lib/api";
import type { CommandResult } from "../components/types";
```

**Path Aliases:**
- Client: `@/` points to `client/src/` (via Vite)
- Server: `@/` points to `server/` (via tsconfig)

## Error Handling

**Patterns:**
- All async operations wrapped in try-catch
- Return `{ exitCode, stderr }` rather than throwing
- Use instanceof checks for error type narrowing
- Set error state for UI feedback

```typescript
try {
  const result = await apiFetch("/api/endpoint");
  // handle success
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to load");
}
```

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Server: Use `logger` from `server/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware

## Comments

**When to Comment:**
- JSDoc rarely used (code is self-documenting)
- Section comments in JSX: `{/* Mobile overlay */}`, `{/* Sidebar */}`
- No trailing comments for obvious code

**JSDoc/TSDoc:**
- Minimal usage
- Interface properties typically self-explanatory

## Function Design

**Size:** Keep functions focused and under 50 lines when possible

**Parameters:**
- Prefer object params for >3 parameters: `body: JSON.stringify({ key, value })`
- Destructure in function signature: `async ({ name }: { name: string }) =>`

**Return Values:**
- Explicit return types on functions
- Async functions return Promises
- API calls return typed data: `apiFetch<CommandResult>(url)`

## Module Design

**Exports:**
- Named exports for functions: `export function Login() {}`
- Named exports for types: `export interface CommandResult {}`
- Default export for React components

**Barrel Files:**
- Not used (direct imports from specific files)

---

*Convention analysis: 2026-02-28*
