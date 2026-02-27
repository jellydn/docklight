# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- kebab-case for all TypeScript files (e.g., `command-executor.ts`, `allowlist.ts`)
- PascalCase for React components (e.g., `AppLayout.tsx`, `ToastProvider.tsx`)
- Page components match route names in PascalCase (e.g., `Dashboard.tsx`, `AppDetail.tsx`)

**Functions:**
- camelCase with verb prefixes: `get` (read), `set` (write), `is`/`has` (boolean), `add`/`remove` (mutations)
- Examples: `getApps()`, `setConfig()`, `isValidAppName()`, `addDomain()`, `removeToast()`
- React components use PascalCase function declarations: `function Dashboard() {}`
- Event handlers prefixed with `handle`: `handleSubmit`, `handleLogout`
- Custom hooks prefixed with `use`: `useToast()`

**Variables:**
- camelCase throughout: `lineCount`, `appNames`, `sanitizedKey`
- React state follows `[value, setValue]` convention: `[loading, setLoading]`
- Constants at module scope use camelCase (not SCREAMING_SNAKE) for most values: `const API_BASE`, `const JWT_SECRET`
- `as const` arrays for enum-like values: `ALLOWED_COMMANDS`, `SUPPORTED_PLUGINS`

**Types:**
- PascalCase for interfaces and types: `CommandResult`, `ServerHealth`, `App`, `SSLStatus`
- No `I` prefix on interfaces
- `interface` for object shapes, inline types for props: `{ children: ReactNode }`
- Union literal types for status enums: `"running" | "stopped"`, `"success" | "error"`

## Code Style

**Formatting:**
- Tool: Biome v2.4.4 (both client and server)
- Indent: tabs (width 2)
- Line width: 100 characters
- Quotes: double quotes
- Semicolons: always
- Trailing commas: ES5 style (trailing in objects/arrays, not function params)

**Linting:**
- Primary tool: Biome (replaces ESLint for day-to-day linting)
- ESLint retained in client for React-specific rules (react-hooks, react-refresh) but Biome is the primary `lint` script
- Key Biome rules:
  - `recommended: true` as baseline
  - `noExplicitAny: off` (both client and server)
  - `useImportType: on` (enforces `import type` for type-only imports)
  - `useNodejsImportProtocol: off` (server; allows bare `"path"` instead of `"node:path"`)
  - `noUnusedVariables: warn` (client only)
  - `useExhaustiveDependencies: off` (client; relaxed React hook deps)
  - `useButtonType: off` (client; allows `<button>` without explicit `type`)
  - `useParseIntRadix: off` (server)

**TypeScript:**
- `strict: true` in all tsconfig files
- Server: CommonJS module, ES2022 target, `.js` extension on relative imports
- Client: ESNext module (bundler mode), `verbatimModuleSyntax: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Client uses `.js` extension on relative component imports (e.g., `from "./types.js"`)

## Import Organization

**Order:**
1. External packages (`express`, `react`, `react-router-dom`)
2. Internal modules (`./lib/executor.js`, `../lib/api`)
3. Type-only imports using `import type` (e.g., `import type { Request, Response } from "express"`)

**Path Aliases:**
- `@/*` → `./src/*` in dev-browser skill only
- No path aliases in main client or server (relative paths throughout)

**Patterns:**
- Server uses `.js` extension on all relative imports (CommonJS/tsc output convention)
- Client uses `.js` extension on relative imports within components; `.tsx` extension for App import in `main.tsx`
- Named exports preferred; only `App` component uses `export default`

## Error Handling

**Server Pattern — Result Objects (no throwing):**
```typescript
// Functions return success data OR error objects — never throw
async function getApps(): Promise<
  App[] | { error: string; command: string; exitCode: number; stderr: string }
> {
  try {
    const result = await executeCommand("dokku apps:list");
    if (result.exitCode !== 0) {
      return { error: "Failed to list apps", command: result.command, exitCode: result.exitCode, stderr: result.stderr };
    }
    // ... parse and return data
  } catch (error: any) {
    return { error: error.message || "Unknown error occurred", command: "...", exitCode: 1, stderr: error.message || "" };
  }
}
```

**Server Validation Pattern — Early return with error objects:**
```typescript
if (!isValidAppName(name)) {
  return { error: "Invalid app name", command: "", exitCode: 400 };
}
```

**Client Pattern — try/catch with state updates:**
```typescript
try {
  const data = await apiFetch<T>("/endpoint");
  setData(data);
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to load data");
}
```

**API Client — centralized 401 handling:**
- `apiFetch()` automatically redirects to `/login` on 401 responses
- Throws `Error` for non-OK responses with server error message

**Error typing:** `catch (error: any)` used consistently on server; `catch (err)` or `catch (_err)` on client

## Logging

**Framework:** `console` (no logging library)
**Patterns:**
- `console.log()` for startup messages: `"Docklight server running on port ${PORT}"`
- `console.warn()` for configuration warnings: missing `DOCKLIGHT_PASSWORD`
- `console.error()` for operational errors: WebSocket errors, logout failures
- No structured logging or log levels beyond console methods

## Comments

**When to Comment:**
- Inline comments for non-obvious logic: `// Sanitize inputs to prevent shell injection`
- Section dividers in JSX: `{/* Server Health */}`, `{/* Apps */}`
- Brief explanatory comments before code blocks: `// Parse CPU from /proc/stat`
- URLs for config references: `// https://vite.dev/config/`

**JSDoc/TSDoc:**
- Not used anywhere in the codebase
- Self-documenting function names and type signatures serve as documentation

## Function Design

**Size:** Functions are small and focused (10–40 lines typical). Largest functions are page components (~100 lines) that include JSX rendering.

**Parameters:**
- Primitive parameters for simple operations: `login(password: string)`
- 1–3 positional parameters typical: `setConfig(name, key, value)`
- Default parameter values used: `timeout: number = 30000`, `limit: number = 20`

**Return Values:**
- Server: union return types of success data `|` error objects (discriminated by `error` property)
- Client: `void` for event handlers; state updates via React hooks
- Boolean for validation: `isValidAppName(name: string): boolean`

## Module Design

**Exports:**
- Named exports throughout (one `export default` for `App` component)
- Each server module exports a cohesive set of functions for one domain:
  - `apps.ts` → `getApps`, `getAppDetail`, `restartApp`, `rebuildApp`, `scaleApp`, `isValidAppName`
  - `auth.ts` → `login`, `generateToken`, `verifyToken`, `setAuthCookie`, `clearAuthCookie`, `authMiddleware`
  - `domains.ts` → `getDomains`, `addDomain`, `removeDomain`
- Interfaces exported alongside their functions

**Barrel Files:**
- Not used. Direct imports to specific module files throughout.

**Client Structure:**
- `lib/` for utilities (`api.ts`)
- `components/` for reusable UI (`AppLayout`, `ToastProvider`, `CommandResult`)
- `pages/` for route-level components (`Dashboard`, `Apps`, `Login`)
- `components/types.ts` for shared component types

**Server Structure:**
- Flat `lib/` directory, one file per domain
- `index.ts` as entry point with all route definitions
- No middleware directory; auth middleware defined in `auth.ts`

## Security Patterns

- Command allowlist (`allowlist.ts`) restricts shell execution to `dokku`, `top`, `free`, `df`
- Input sanitization via regex replacement before shell execution
- Validation-then-reject pattern: sanitize, compare to original, reject if different
- JWT authentication with HTTP-only cookies
- WebSocket connections authenticated via cookie verification

---
*Convention analysis: 2026-02-27*
