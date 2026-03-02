# AGENTS.md - Docklight Development Guide

Docklight is a minimal, self-hosted web UI for managing a Dokku server.

## Project Structure

- **server/** - Express backend with TypeScript (port 3001)
- **client/** - React + Vite frontend (port 5173)
- Architecture: `Browser → React SPA → Express API → Shell Exec → Dokku CLI → Docker`

## Commands

### Quick Commands (justfile)

```bash
just install      # Install all dependencies
just server-dev   # Run server dev server
just client-dev   # Run client dev server
just test         # Run all tests
just lint         # Lint both server and client
just typecheck    # Type check both projects
just build        # Build both projects
```

### Single Test Commands

```bash
# Server
vitest run lib/apps.test.ts                    # Single test file
vitest run -t "should fetch app"               # Single test by name

# Client
vitest run src/hooks/use-app.test.ts           # Single test file
vitest run -t "should display apps"            # Single test by name
```

## Post-Change Requirements

**ALWAYS run after making changes:**

- `bun run typecheck` - Type check TypeScript
- `bun run lint` - Lint code with biome
- `bun test` - Run tests

## Code Style Guidelines

### TypeScript

- Explicit types for function parameters and return types
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

- Use `.js` extension for relative imports (even in `.ts` files)
- Group: external → internal → types
- Client: use `@/` alias for `client/src/*`

```typescript
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import type { Data } from "./lib/types.js";
import { cn } from "@/lib/utils"; // Client only
```

### React Conventions

- Use functional components with hooks
- Use `class-variance-authority` (cva) for component variants
- Use `clsx` + `tailwind-merge` via `cn()` helper
- Prefer Radix UI primitives for accessible components

### Error Handling

- Return `{ exitCode, stderr, stdout, command }` for shell commands
- Never throw errors for expected failures
- Use type assertions for caught errors

```typescript
try {
  const result = await execAsync(cmd, { timeout });
  return {
    command: cmd,
    exitCode: 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return {
    command: cmd,
    exitCode: err.code || 1,
    stdout: "",
    stderr: err.message || "",
  };
}
```

### Logging

- Use `logger` from `server/lib/logger.ts` (Pino)
- Log errors with context: `logger.error({ err }, "Error message")`

### Database

- Use better-sqlite3 with prepared statements
- Create tables with `IF NOT EXISTS`

### Security

- Never expose shell execution to clients
- Use command allowlists (`server/lib/allowlist.ts`)
- JWT-based authentication, require `JWT_SECRET`

### Testing (Vitest)

- Test files: `*.test.ts`
- Mock external dependencies with `vi.mock()`
- Use `beforeEach()` to reset mocks
- Use supertest for HTTP endpoint testing

```typescript
vi.mock("./lib/apps.js", () => ({ getApps: vi.fn() }));

describe("API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return list of apps", async () => {
    vi.mocked(getApps).mockResolvedValue([{ name: "app1" }] as never);
    const response = await request(app).get("/api/apps");
    expect(response.status).toBe(200);
  });
});
```

### Environment Variables

Server:

- `JWT_SECRET` - Required for JWT signing
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target (e.g., "dokku@server-ip")
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `LOG_LEVEL` - Logging level (default: "info")
- `DOCKLIGHT_DB_PATH` - SQLite database path (default: `data/docklight.db`)
