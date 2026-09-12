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
# Server (from project root)
cd server && bun run test                          # All server tests
cd server && bun run test:watch                    # Watch mode
vitest run server/lib/apps.test.ts                 # Single test file
vitest run -t "should fetch app" --dir server      # Single test by name

# Client (from project root)
cd client && bun run test                          # All client tests
cd client && bun run test:watch                     # Watch mode
vitest run client/src/hooks/use-app.test.ts        # Single test file
vitest run -t "should display apps" --dir client   # Single test by name

# E2E Tests (client)
cd client && bun run test:e2e                       # Run E2E tests
cd client && bun run test:e2e:ui                   # Run E2E with UI
```

### Format Commands

```bash
# Format all code
just format
just server-format
just client-format

# Or using bun directly
cd server && bun run format
cd client && bun run format
```

### Coverage Commands

```bash
# Server coverage
cd server && bun run test:coverage

# Client coverage
cd client && bun run test:coverage
```

### Development Workflow

```bash
# Start both server and client in development
just server-dev   # Terminal 1: Server on port 3001
just client-dev   # Terminal 2: Client on port 5173

# Or run both with bun concurrently (from project root)
bun --bun run server/dev & bun --bun run client/dev
```

## Post-Change Requirements

**ALWAYS run after making changes:**

- `bun run typecheck` - Type check TypeScript (root-level, checks both)
- `bun run lint` - Lint code with biome (root-level, checks both)
- `bun test` - Run tests (root-level, runs server + client tests)

Individual project commands:

```bash
just server-typecheck  just server-lint
just client-typecheck  just client-lint
```

## Code Style Guidelines

### TypeScript

- Explicit types for function parameters and return types
- Use `import type` for type-only imports
- Use `interface` for object shapes, `type` for unions/primitives
- **DO NOT ADD comments unless asked** - write self-documenting code

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

### Formatting

- Use Biome for formatting: `bun run format` or `just format`
- Format files individually: `biome format --write path/to/file.ts`
- Run format check without writing: `biome format --check .`

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

Server (.env or environment):

- `JWT_SECRET` - Required for JWT signing
- `DOCKLIGHT_DOKKU_SSH_TARGET` - Container-reachable Dokku SSH target (e.g., "dokku@172.17.0.1")
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `LOG_LEVEL` - Logging level (default: "info")
- `DOCKLIGHT_DB_PATH` - SQLite database path (default: `data/docklight.db`)

### Database

- SQLite with better-sqlite3 (server-side)
- Tables created with `IF NOT EXISTS`
- Prepared statements for all queries
- Database path configured via `DOCKLIGHT_DB_PATH`

### Tailwind CSS

- Use Tailwind 4 with `@tailwindcss/postcss`
- Use `tw-animate-css` for animations
- Client components use the `cn()` helper for class merging

## Cursor Cloud specific instructions

- Toolchain: `bun` and `just` are required and are installed at the system level (`/usr/local/bin`). Node 22 is preinstalled. The startup update script runs `bun install` in both `server/` and `client/`; standard commands live in the `## Commands` section above.
- Run dev servers (long-lived) in separate tmux sessions, not one-shot: backend `cd server && bun run dev` (port 3001), frontend `cd client && bun run dev` (port 5173, proxies `/api` → 3001). Do not use `just build`/`bun start` for development.
- `JWT_SECRET` is only mandatory in production; in dev the server boots with a built-in dev secret. There is no `server/.env` committed — export `JWT_SECRET` if you want a custom one.
- No Dokku host is available in this environment. Login, user management, the audit log, and the SQLite-backed dashboard cards (CPU/Mem/Disk run via local shell) all work. Any real Dokku action (apps/databases/domains/SSL) will error unless `DOCKLIGHT_DOKKU_SSH_TARGET` points to a reachable Dokku host — this is expected, not a setup failure. Leave `DOCKLIGHT_DOKKU_SSH_TARGET` unset in dev so commands run locally instead of trying the example `dokku@172.17.0.1`.
- No signup UI: bootstrap an admin with `cd server && npx tsx createUser.ts <user> <password>` (creates/updates an `admin` user in the SQLite DB at `data/docklight.db`). Re-running updates the password.
- `just test` runs Vitest for both projects (no Dokku needed; deps are mocked). Playwright E2E (`cd client && bun run test:e2e`) builds the client and mocks all `/api` responses, so it also needs no real backend — but requires Playwright browsers to be installed first.
