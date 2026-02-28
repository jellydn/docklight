# AGENTS.md - Docklight Development Guide

Docklight is a minimal, self-hosted web UI for managing a Dokku server.

## Project Structure

- **server/** - Express backend with TypeScript (port 3001)
- **client/** - React + Vite frontend (port 5173)

## Commands

### Quick Commands (justfile)

```bash
just install          # Install all dependencies
just server-dev       # Run server dev server
just client-dev       # Run client dev server
just test             # Run all tests
just lint             # Lint both server and client
just format           # Format both server and client
just typecheck        # Type check both projects
just build            # Build both projects
```

### Server (workdir: server/)

```bash
bun install              # Install dependencies
bun run dev              # Dev server (tsx watch)
bun run typecheck        # Type check (tsc --noEmit)
bun run build            # Build for production (tsc)
bun start                # Start production server
bun run lint             # Lint (biome)
bun run format           # Format (biome)
bun test                 # Run tests (vitest run)
bun run test:watch       # Watch mode
bun run test:coverage    # Run with coverage
vitest run lib/single-test.test.ts        # Single test file
vitest run -t "test name"                  # Single test by name
vitest run lib/apps.test.ts -t "should fetch app"  # Single test in file
```

### Client (workdir: client/)

```bash
bun install
bun run dev          # Dev server (port 5173)
bun run build        # Build (tsc -b && vite build)
bun run typecheck    # Type check (tsc -b)
bun run lint         # Lint (biome)
bun run format       # Format (biome)
bun run preview      # Preview production build
bun test             # Run tests (vitest run)
bun run test:watch   # Watch mode
bun run test:coverage # Run with coverage
vitest run src/hooks/use-app.test.ts        # Single test file
vitest run -t "should display apps"         # Single test by name
```

## Post-Change Requirements

**ALWAYS run after making changes:**

- `bun run typecheck` - Type check TypeScript
- `bun run lint` - Lint code with biome
- `bun test` - Run tests to ensure nothing broke

## Code Style Guidelines

### TypeScript

- Explicit types for function parameters and return types
- Enable `strict: true` in tsconfig.json
- Use `import type` for type-only imports
- Use `interface` for object shapes, `type` for unions/primitives

### Naming Conventions

| Type               | Convention           | Example               |
| ------------------ | -------------------- | --------------------- |
| Files              | kebab-case           | `command-executor.ts` |
| Functions          | camelCase            | `getData`, `isActive` |
| Classes/Interfaces | PascalCase           | `UserService`         |
| Constants          | SCREAMING_SNAKE_CASE | `MAX_RETRIES`         |

### Imports

- Use ES modules with `.js` extension for relative imports
- Group: external → internal → types
- Use path aliases when available (`@/*`)
- Client: `@/` points to `client/src/`
- Server: `@/` points to `server/`

```typescript
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import type { Data } from "./lib/types.js";
import { apiFetch } from "@/lib/api";
```

### Formatting (biome)

- Indent: tabs (2 spaces), Strings: double quotes
- Trailing commas: es5, Line width: 100, Semicolons: always

### React Conventions

- Use functional components with hooks
- Use `class-variance-authority` (cva) for component variants
- Use `clsx` + `tailwind-merge` for conditional classes
- Prefer Radix UI primitives for accessible components

```typescript
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const buttonVariants = cva("base", {
  variants: {
    variant: { primary: "primary-classes", secondary: "secondary" },
    size: { sm: "sm", md: "md" },
  },
});

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
```

### Error Handling

- Use try-catch for async operations
- Return `{ exitCode, stderr }` rather than throwing

```typescript
try {
  const result = await execAsync(cmd, { timeout });
  return { ...result, exitCode: 0 };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return { exitCode: err.code || 1, stderr: err.message };
}
```

### Logging

- Framework: Pino (structured logging)
- Server: Use `logger` from `server/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware

### Database

- Use better-sqlite3 for sync SQLite
- Use prepared statements (prevent SQL injection)
- Create tables with `IF NOT EXISTS`

### Security

- Never expose shell execution to clients
- Use command allowlists (`server/lib/allowlist.ts`)
- Validate and sanitize all inputs

### Testing (Vitest)

- Test files: `*.test.ts`, use descriptive test names
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
