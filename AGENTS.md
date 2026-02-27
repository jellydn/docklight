# AGENTS.md - Docklight Development Guide

Docklight is a minimal, self-hosted web UI for managing a Dokku server.

## Project Structure

- **server/** - Express backend with TypeScript (port 3001)
- **client/** - React + Vite frontend (port 5173)
- **.agents/skills/dev-browser/** - Browser automation for testing

## Commands

### Server

```bash
cd server
bun install          # Install dependencies
bun run dev          # Dev server with hot reload
bun run typecheck    # Type check
bun run build        # Build for production
bun start            # Start production server
bun run lint         # Lint (biome)
bun run format       # Format (biome)
```

### Client

```bash
cd client
bun install
bun run dev          # Dev server (port 5173)
bun run build
bun run typecheck
bun run lint
bun run format
bun run preview      # Preview production build
```

### Dev Browser (Testing)

```bash
cd .agents/skills/dev-browser
bun install
bun test             # Run all tests
bun run test:watch   # Watch mode

# Single test file
npx vitest run src/snapshot/index.test.ts

# Single test by name
npx vitest run -t "test name"

bun run start-server     # Start Docklight server (integration tests)
bun run start-extension  # Start browser extension relay
```

### Justfile Shortcuts

```bash
just                           # List all recipes
just install                   # Install all deps
just server-dev/client-dev    # Run dev servers
just server-typecheck         # Type check all
just lint                     # Lint all
just format                   # Format all
just build                    # Build all
just browser-test             # Run browser tests
```

## Code Style Guidelines

### TypeScript

- Explicit types for function parameters and return types
- Enable `strict: true` in tsconfig.json
- Use `import type` for type-only imports
- Use `interface` for object shapes, `type` for unions/primitives

### Naming Conventions

| Type                     | Convention              | Example                   |
| ------------------------ | ----------------------- | ------------------------- |
| Files                    | kebab-case              | `command-executor.ts`     |
| Functions                | camelCase + verb prefix | `getData`, `isActive`     |
| Classes/Interfaces/Types | PascalCase              | `UserService`, `AppState` |
| Constants                | SCREAMING_SNAKE_CASE    | `MAX_RETRIES`             |

### Imports

- Use ES modules with `.js` extension for relative imports
- Group: external → internal → types
- Use path aliases when available (`@/*`)

```typescript
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import type { Data } from "./lib/types.js";
```

### Formatting (biome)

- Indent: tabs (2 spaces)
- Strings: double quotes
- Trailing commas: es5
- Line width: 100
- Semicolons: always

### Error Handling

- Use try-catch for async operations
- Return `{ exitCode, stderr }` rather than throwing
- Log errors with `console.error`

```typescript
try {
  const result = await execAsync(cmd, { timeout });
  return { ...result, exitCode: 0 };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return { exitCode: err.code || 1, stderr: err.message };
}
```

### Database

- Use better-sqlite3 for sync SQLite
- Use prepared statements (prevent SQL injection)
- Create tables with `IF NOT EXISTS`

### Security

- Never expose shell execution to clients
- Use command allowlists (`server/lib/allowlist.ts`)
- Validate and sanitize all inputs

### Testing (Vitest)

- Test files: `*.test.ts`
- Use descriptive test names
- Mock external dependencies

```typescript
import { describe, it, expect, vi } from "vitest";

describe("functionName", () => {
  it("should do something specific", () => {
    expect(result).toBe(expected);
  });
});
```

## Architecture

```
Browser → React SPA → Express API → Shell Exec → Dokku CLI → Docker
```

- API runs on same VPS as Dokku
- Commands restricted to predefined allowlist
- All commands show exit code and output for transparency
