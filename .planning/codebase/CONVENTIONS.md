# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- kebab-case for most files: `command-executor.ts`, `app-layout.tsx`
- PascalCase for page components: `Apps.tsx`, `Dashboard.tsx`
- Test files: Same name with `.test.ts` suffix

**Functions:**
- camelCase: `getApps`, `executeCommand`, `validateUser`
- Boolean functions: Prefix with `is/has/can`: `isValid`, `hasPermission`

**Variables:**
- camelCase: `jwtSecret`, `sshTarget`, `commandResult`
- Constants: SCREAMING_SNAKE_CASE at module level: `MAX_RETRIES`, `DEFAULT_TTL`

**Types:**
- Interfaces: PascalCase for object shapes: `CommandResult`, `User`, `App`
- Type aliases: PascalCase for unions/primitives: `CommandResultLike`, `JwtPayload`

## Code Style

**Formatting:**
- Tool: Biome 2.4.4
- Key settings:
  - Indent: tabs (displayed as 2 spaces)
  - Quotes: double quotes
  - Trailing commas: es5
  - Line width: 100 characters
  - Semicolons: always

**Linting:**
- Tool: Biome 2.4.4
- Key rules: TypeScript strict mode, import sorting, no unused variables

## Import Organization

**Order:**
1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Type-only imports (use `import type`)

**Path Aliases:**
- Client: `@/*` → `client/src/*` (configured in `client/tsconfig.json`)
- Server: No path alias configured, use relative imports

## Error Handling

**Patterns:**
- Command execution: Return `CommandResult` object with exitCode/stdout/stderr
- Never throw for expected failures (command execution errors)
- Use try-catch for async operations
- Type assertions for caught errors
- Log errors with context using Pino logger

## Logging

**Framework:** Pino (structured logging)

**Patterns:**
- Server: Import logger from `server/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware
- Log level: Controlled by `LOG_LEVEL` env var (default: "info")

## Comments

**When to Comment:**
- Non-obvious business logic
- Complex algorithms or workarounds
- TODO/FIXME markers for future work (rare in this codebase)

**JSDoc/TSDoc:**
- Minimal usage in this codebase
- Types are mostly self-documenting with TypeScript
- Exported functions have clear parameter/return types

## Function Design

**Size:** Prefer smaller, focused functions. Large files exist (apps.ts ~1000 lines) but are domain-specific service modules.

**Parameters:**
- Explicit types for all parameters
- Use options objects for >3 parameters
- Destructure in function signature for clarity

**Return Values:**
- Explicit return types always required
- Use `CommandResult` type for command execution
- Use `CommandResultLike` for HTTP responses

## Module Design

**Exports:**
- Named exports for functions and utilities
- Default exports for React components (some inconsistency)
- Prefer named exports for better tree-shaking

**Barrel Files:**
- `client/src/components/index.ts` - Re-exports UI components
- `server/lib/` modules export specific functions

---

*Convention analysis: 2026-03-02*
