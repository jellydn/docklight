# AGENTS.md - Docklight Development Guide

This file provides guidance for AI agents working in this repository.

## Project Overview

Docklight is a minimal, self-hosted web UI for managing a Dokku server. It consists of:

- **server/** - Express backend with TypeScript (port 3001)
- **.agents/skills/dev-browser/** - Browser automation skill for testing

## Commands

### Server (docklight-server)

```bash
cd server

# Install dependencies
bun install

# Development (with hot reload)
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build

# Start production server
bun start

# Lint code (biome)
bun run lint

# Format code (biome)
bun run format
```

### Client (React + Vite)

```bash
cd client

# Install dependencies
bun install

# Development server (port 5173)
bun run dev

# Build for production
bun run build

# Type check
bun run typecheck

# Lint code (biome - replaces eslint)
bun run lint

# Format code (biome)
bun run format

# Preview production build
bun run preview
```

### Dev Browser Skill

```bash
cd .agents/skills/dev-browser

# Install dependencies
bun install

# Run all tests
bun test

# Watch mode for tests
bun run test:watch

# Single test file
npx vitest run src/snapshot/index.test.ts

# Single test by name
npx vitest run -t "test name"

# Start Docklight server (for integration testing)
bun run start-server

# Start browser extension relay
bun run start-extension
```

## Code Style Guidelines

### TypeScript

- Use explicit types for function parameters and return types
- Enable `strict: true` in tsconfig.json
- Use `import type` for type-only imports
- Use interface for object shapes, type for unions/primitives

### Naming Conventions

- **Files**: kebab-case (e.g., `command-executor.ts`)
- **Functions**: camelCase, use verb prefixes (`get`, `set`, `is`, `has`)
- **Classes/Interfaces/Types**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE for config values
- **Interfaces**: Add `I` prefix only when necessary to avoid collision

### Imports

- Use ES module syntax with `.js` extension for relative imports
- Group imports: external → internal → types
- Use path aliases when available (`@/*` in dev-browser)

```typescript
import express from "express";
import type { Request, Response } from "express";
import { getData } from "./lib/db.js";
import type { Data } from "./lib/types.js";
```

### Formatting

- Use tabs for indentation (2 spaces)
- Use double quotes for strings
- Add trailing commas in multiline objects/arrays
- Maximum line length: 100 characters
- Use semicolons

### Error Handling

- Use try-catch for async operations
- Return error results with exitCode and stderr rather than throwing
- Log errors with console.error for debugging

```typescript
// Good pattern from executor.ts
try {
  const result = await execAsync(command, { timeout });
  return { ...result, exitCode: 0 };
} catch (error: unknown) {
  const err = error as { code?: number; message?: string };
  return { exitCode: err.code || 1, stderr: err.message };
}
```

### Database

- Use better-sqlite3 for synchronous SQLite operations
- Use prepared statements to prevent SQL injection
- Create tables with `IF NOT EXISTS`

### Security

- Never expose shell execution directly to clients
- Use command allowlists (see `server/lib/allowlist.ts`)
- Validate and sanitize all user inputs
- Use JWT for authentication in production

### Testing (dev-browser skill)

- Tests use Vitest with Node environment
- Include `*.test.ts` suffix
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
- Commands are restricted to predefined allowlist
- All commands show exit code and output for transparency

### Justfile

A `justfile` provides convenient shortcuts for common commands:

```bash
# List all available recipes
just

# Install all dependencies
just install

# Server commands
just server-dev
just server-build
just server-typecheck
just server-lint
just server-format

# Client commands
just client-dev
just client-build
just client-typecheck
just client-lint
just client-format
just client-preview

# Dev Browser commands
just browser-test
just browser-test-watch
just browser-start-server

# Run all checks
just typecheck
just lint
just format
just build
```
