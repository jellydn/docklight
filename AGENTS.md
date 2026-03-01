# AGENTS.md - Docklight Development Guide

Docklight is a minimal, self-hosted web UI for managing a Dokku server.

## Project Structure

- **server/** - Express backend with TypeScript (port 3001)
- **client/** - React + Vite frontend (port 5173)
- Architecture: `Browser → React SPA → Express API → Shell Exec → Dokku CLI → Docker`

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
vitest run lib/single-test.test.ts                    # Single test file
vitest run -t "test name"                              # Single test by name
vitest run lib/apps.test.ts -t "should fetch app"     # Single test in file
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
vitest run src/hooks/use-app.test.ts                  # Single test file
vitest run -t "should display apps"                   # Single test by name
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
- Use `import type` for type-only imports (enforced by biome)
- Use `interface` for object shapes, `type` for unions/primitives
- Vitest globals are configured in tsconfig: `types: ["node", "vitest/globals"]`

### Naming Conventions

| Type               | Convention           | Example               |
| ------------------ | -------------------- | --------------------- |
| Files              | kebab-case           | `command-executor.ts` |
| Functions          | camelCase            | `getData`, `isActive` |
| Classes/Interfaces | PascalCase           | `UserService`         |
| Constants          | SCREAMING_SNAKE_CASE | `MAX_RETRIES`         |

### Imports

- Use ES modules with `.js` extension for relative imports (even in `.ts` files)
- Group: external → internal → types
- Use path aliases when available (`@/*`)
- Client: `@/` points to `client/src/*`
- Server: No path alias configured, use relative imports

```typescript
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import type { Data } from "./lib/types.js";
import { cn } from "@/lib/utils"; // Client only
```

### Formatting (biome)

- Indent: tabs (2 spaces), Strings: double quotes
- Trailing commas: es5, Line width: 100, Semicolons: always
- Biome config: `biome.json` in each package

### React Conventions

- Use functional components with hooks
- Use `class-variance-authority` (cva) for component variants
- Use `clsx` + `tailwind-merge` for conditional classes via `cn()` helper
- Prefer Radix UI primitives for accessible components
- Use `React.forwardRef` for components that need ref forwarding

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card", className)} {...props} />
  )
);
```

### Error Handling

- Use try-catch for async operations
- Return `{ exitCode, stderr, stdout, command }` for shell commands
- Never throw errors for expected failures (e.g., command execution errors)
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
  const err = error as {
    code?: number;
    stdout?: string;
    stderr?: string;
    message?: string;
  };
  return {
    command: cmd,
    exitCode: err.code || 1,
    stdout: err.stdout || "",
    stderr: err.stderr || err.message || "",
  };
}
```

### Logging

- Framework: Pino (structured logging)
- Server: Use `logger` from `server/lib/logger.ts`
- Log errors with context: `logger.error({ err }, "Error message")`
- HTTP requests logged automatically via pino-http middleware
- Log level controlled by `LOG_LEVEL` env var (default: "info")

### Database

- Use better-sqlite3 for sync SQLite
- Use prepared statements (prevent SQL injection)
- Create tables with `IF NOT EXISTS`
- Store command execution history for audit trail

### Security

- Never expose shell execution to clients
- Use command allowlists (`server/lib/allowlist.ts`)
- Validate and sanitize all inputs
- JWT-based authentication with `jsonwebtoken`
- Environment variables required: `JWT_SECRET`

### Environment Variables

Server:

- `JWT_SECRET` - Required for JWT signing
- `LOG_LEVEL` - Logging level (default: "info")
- `NODE_ENV` - Environment (development/production)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target (e.g., "dokku@server-ip")
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Root SSH target for plugin management
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Custom SSH options

### Testing (Vitest)

- Test files: `*.test.ts`, use descriptive test names
- Mock external dependencies (file system, network, child processes)
- Use `vi.mock()` at module level, `vi.mocked()` for type-safe mocking
- Use `beforeEach()` to reset mocks between tests
- Use supertest for HTTP endpoint testing

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("./lib/apps.js", () => ({
  getApps: vi.fn(),
}));

describe("API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of apps", async () => {
    const mockApps = [{ name: "app1", status: "running" }];
    vi.mocked(getApps).mockResolvedValue(mockApps as never);

    const response = await request(app).get("/api/apps");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockApps);
  });
});
```

### WebSocket

- Use `ws` library for real-time log streaming
- Server setup in `server/lib/websocket.ts`
- Stream Dokku app logs in real-time to connected clients
