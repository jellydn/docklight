# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- `kebab-case` for server modules in `server/lib/*.ts` (for example `server/lib/allowlist.ts`, `server/lib/websocket.ts`).
- React page/component files use PascalCase in `client/src/pages/*.tsx` and `client/src/components/*.tsx` (for example `client/src/pages/AppDetail.tsx`, `client/src/components/ToastProvider.tsx`).

**Functions:**
- camelCase with verb-oriented names in backend helpers and handlers (for example `executeCommand` in `server/lib/executor.ts`, `getDatabases` in `server/lib/databases.ts`, `setAuthCookie` in `server/lib/auth.ts`).
- Event-style handler naming in React (`handleLogout`, `handleCreateDatabase`, `confirmDestroyDatabase`) in `client/src/components/AppLayout.tsx` and `client/src/pages/Databases.tsx`.

**Variables:**
- `UPPER_SNAKE_CASE` for constants (`ALLOWED_COMMANDS` in `server/lib/allowlist.ts`, `SUPPORTED_PLUGINS` in `server/lib/databases.ts`).
- camelCase for runtime state and locals (`pendingScaleType`, `visibleConnections`) in `client/src/pages/AppDetail.tsx` and `client/src/pages/Databases.tsx`.

**Types:**
- PascalCase `interface` for object shapes (`CommandResult` in `server/lib/executor.ts` and `client/src/components/types.ts`, `SSLStatus` in `server/lib/ssl.ts`).
- String-literal union types for bounded values (`type TabType = "overview" | "config" | "domains" | "logs" | "ssl"` in `client/src/pages/AppDetail.tsx`).

## Code Style

**Formatting:**
- Biome formatter is used in both apps via `server/package.json` (`"format": "biome format --write ."`) and `client/package.json` (`"format": "biome format --write ."`).
- Formatting settings are explicit in `server/biome.json` and `client/biome.json`: tabs, width 2, line width 100, double quotes, trailing commas `es5`, semicolons always.

**Linting:**
- Biome linting is used via `server/package.json` and `client/package.json` (`"lint": "biome lint ."`).
- Shared rule patterns in `server/biome.json` and `client/biome.json`: recommended rules enabled, `useImportType` enabled, `noExplicitAny` disabled.
- Client-specific relaxations in `client/biome.json`: `noNonNullAssertion` off, `useExhaustiveDependencies` off, `useButtonType` off.

## Import Organization

**Order:**
1. External packages first (for example `import express from "express"` in `server/index.ts`).
2. Internal project imports next (for example `import { logger } from "./lib/logger.js"` in `server/index.ts`).
3. Type imports inline or separate with `import type` (for example `import type { Request, Response, NextFunction } from "express"` in `server/lib/auth.ts`, `import { spawn, type ChildProcess } from "child_process"` in `server/lib/websocket.ts`).

**Path Aliases:**
- No alias in main server/client app code; they use relative imports (`server/lib/*.ts`, `client/src/**/*.ts(x)`).
- `@/*` alias is configured only in `.agents/skills/dev-browser/package.json` and used in skill code (for example `.agents/skills/dev-browser/src/index.ts`).

## Error Handling

**Patterns:**
- Backend uses `try/catch` and returns structured error objects instead of throwing in many modules (`server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`, `server/lib/ssl.ts`, `server/lib/server.ts`).
- Input validation returns early with `exitCode: 400` style objects (`server/lib/config.ts`, `server/lib/domains.ts`, `server/lib/databases.ts`).
- Frontend wraps API calls in `try/catch` and converts failures to local UI state/toasts (`client/src/pages/AppDetail.tsx`, `client/src/pages/Databases.tsx`, `client/src/pages/Login.tsx`).

## Logging

**Framework:** pino

**Patterns:**
- Server logger is centralized in `server/lib/logger.ts` and wired into HTTP logging via `pino-http` in `server/index.ts`.
- Security/runtime warnings are logged in `server/lib/auth.ts`.
- WebSocket/runtime parse errors are logged with structured metadata in `server/lib/websocket.ts` and `client/src/pages/AppDetail.tsx`.

## Comments

**When to Comment:**
- Comments are sparse and mainly explain intent for non-trivial behavior (examples: SPA fallback and static serving in `server/index.ts`, input sanitization rationale in `server/lib/config.ts`, plugin discovery steps in `server/lib/databases.ts`).

**JSDoc/TSDoc:**
- No JSDoc/TSDoc blocks were observed in core app source (`server/*.ts`, `server/lib/*.ts`, `client/src/**/*.ts(x)`).

## Function Design

**Size:** medium-to-large orchestrator functions are common (for example `getDatabases` in `server/lib/databases.ts`, `AppDetail` component in `client/src/pages/AppDetail.tsx`).

**Parameters:** explicit primitive parameters with validation (for example `scaleApp(name, processType, count)` in `server/lib/apps.ts`, `setConfig(name, key, value)` in `server/lib/config.ts`).

**Return Values:**
- Backend frequently uses union return types: success payload or error object (`server/lib/apps.ts`, `server/lib/config.ts`, `server/lib/ssl.ts`).
- Frontend data access uses generic typed fetch helper (`apiFetch<T>`) in `client/src/lib/api.ts`.

## Module Design

**Exports:**
- Named exports are standard in backend modules (`server/lib/*.ts`) and most frontend modules (`client/src/components/*.tsx`, `client/src/pages/*.tsx`).
- Default export is used for root app component in `client/src/App.tsx`.

**Barrel Files:**
- No barrel index files were observed for server/client feature modules (`server/lib/`, `client/src/components/`, `client/src/pages/`).

---

*Convention analysis: 2026-02-27*
