# Docklight Coding Conventions

This document outlines the coding standards, naming conventions, architectural patterns, and error-handling rules enforced across the Docklight codebase.

---

## 1. Code Style & Formatting

### Biome Configuration
Docklight uses **Biome (v2.4.5)** as an all-in-one formatter and linter for both frontend (`client/`) and backend (`server/`). Do not use ESLint or Prettier.

Key configuration rules (defined in `biome.json` files):
*   **Indentation:** Always use **Tabs** (not spaces) for indentation.
*   **Indent Width:** Set to `2` (interpreted as 2 spaces equivalent).
*   **Line Width:** Maximum line length is **100 characters**.
*   **Quotes:** Always use **Double Quotes** (`"`) for strings in JavaScript and TypeScript.
*   **Trailing Commas:** Enforce ES5 trailing commas.
*   **Semicolons:** Semicolons are **Always** required at the end of statements.

### Lint Rules Overrides
*   `noExplicitAny`: **Off** (use with care; explicit types are preferred, but `any` is allowed where generic constraints are impractical).
*   `useImportType`: **On** (forces type-only imports using `import type`).
*   `noNonNullAssertion`: **Off** in client (allows TS non-null assertion operator `!`).
*   `useExhaustiveDependencies`: **Off** in client (React hooks dependency checks are not strictly enforced).
*   `useButtonType`: **Off** in client.
*   `useNodejsImportProtocol`: **Off** in server (e.g. allowing `import path from "path"` rather than `import path from "node:path"`).

---

## 2. Naming Conventions

| Identifier Type | Case Convention | Examples |
| :--- | :--- | :--- |
| **Files** | `kebab-case` | `command-executor.ts`, `use-native-dialog.ts` |
| **Test Files** | `<name>.test.ts[x]` or `<name>.spec.ts` | `executor.test.ts`, `apps.spec.ts` (E2E) |
| **Functions** | `camelCase` | `getApps()`, `executeCommand()`, `isCommandAllowed()` |
| **Variables** | `camelCase` | `appName`, `exitCode`, `stdout`, `stderr` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `JWT_SECRET`, `ALLOWED_COMMANDS` |
| **Classes** | `PascalCase` | `SSHPool`, `MockWebSocket` |
| **Interfaces / Types** | `PascalCase` | `JWTPayload`, `CommandResult`, `UserRole` |

---

## 3. TypeScript Patterns

### Type Declarations
*   Always define explicit return types for public-facing functions and API controllers.
*   Use `interface` for object shapes and structures that may need extension.
*   Use `type` for union types, primitives, and mapped types.
*   Prefer self-documenting code. Do not add comments unless specifically asked or if explaining complex workarounds.

### ES Modules & Relative Imports
*   Relative imports in TypeScript **must include the `.js` extension** (e.g., `import { getApps } from "./lib/apps.js"`), even when importing `.ts` files.
*   Group imports in the following sequence:
    1.  External libraries / npm packages
    2.  Workspace / internal modules (using `@/` for client or relative `./` / `../`)
    3.  Type-only imports using `import type`
*   **Path Aliases:** The client uses `@/` to refer to `client/src/*` (e.g., `import { cn } from "@/lib/utils";`).

---

## 4. React & Frontend Conventions

### Component Structure
*   Implement components exclusively as functional components using React Hooks.
*   Prefer modern React 19 patterns. For example, retrieve context using `use(Context)` instead of `useContext(Context)`:
    ```typescript
    import { use } from "react";
    import { AuthContext } from "./auth-context.js";

    const auth = use(AuthContext);
    ```

### Styles and Design System
*   **Tailwind CSS 4:** Styling is done using Tailwind 4 alongside postcss.
*   **Aesthetics:** All user interfaces must look high-end, dynamic, and polished. Avoid default/generic colors. Use themed CSS design tokens (`--background`, `--foreground`, `--destructive`, `--success`, `--warning`, etc.) rather than hardcoded classes.
    *   **Do:** Use `bg-card` instead of `bg-white`.
    *   **Do:** Use `text-muted-foreground` instead of `text-gray-500`.
    *   **Do:** Use `hover:bg-accent` instead of `hover:bg-gray-100`.
*   **Class Merging:** Always use the `cn()` helper (which combines `clsx` and `tailwind-merge`) when merging Tailwind classes dynamically:
    ```typescript
    import { cn } from "@/lib/utils";

    export function MyButton({ className, ...props }) {
      return <button className={cn("bg-primary text-on-primary", className)} {...props} />;
    }
    ```
*   **Component Variants:** Use `class-variance-authority` (cva) for styling complex multi-variant components.
*   **Accessibility (a11y):** Prefer Radix UI primitives or semantic HTML5 tags. Focus states, keyboard navigation, and button styles must be fully operational.

### API Validation
*   Validate all API responses on the client side using **Zod** schemas.
*   Infer static types from Zod schemas:
    ```typescript
    import { z } from "zod";

    export const AppSchema = z.object({
      name: z.string(),
      status: z.enum(["running", "stopped"]),
    });

    export type App = z.infer<typeof AppSchema>;
    ```

---

## 5. Backend (Express + SQLite) Architecture

### Database Integration
*   Use `better-sqlite3` as the database engine.
*   Always use prepared statements (`db.prepare(...)`) for queries and mutations. Avoid SQL injection vulnerabilities.
*   Configure the database with highly performant settings:
    ```typescript
    newDb.pragma("journal_mode = WAL");
    newDb.pragma("synchronous = NORMAL");
    newDb.pragma("foreign_keys = ON");
    ```
*   Define migrations defensively using `CREATE TABLE IF NOT EXISTS` and check for missing columns using `PRAGMA table_info`.

### Middleware and JWT
*   Fail closed: if `process.env.JWT_SECRET` is not set and the application is not in development/test, throw an error and refuse to start.
*   Augment the `Express.Request` interface to store authentication credentials:
    ```typescript
    declare global {
      namespace Express {
        interface Request {
          user?: JWTPayload;
        }
      }
    }
    ```

### Logging
*   Use `pino` (via `server/lib/logger.ts`) for server logs.
*   Log errors with the error object passed as context:
    ```typescript
    logger.error({ err }, "Failed to execute restart command");
    ```

---

## 6. Error Handling & Command Execution

### Command Return Format
*   Never throw exceptions for expected shell/SSH command failures.
*   Always return a unified `CommandResult` object:
    ```typescript
    export interface CommandResult {
      command: string;
      exitCode: number;
      stdout: string;
      stderr: string;
    }
    ```
*   Assert caught errors and parse exit codes/messages safely:
    ```typescript
    try {
      const result = await execAsync(cmd, { timeout });
      return { command: cmd, exitCode: 0, stdout: result.stdout, stderr: result.stderr };
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      return { command: cmd, exitCode: err.code || 1, stdout: "", stderr: err.message || "" };
    }
    ```

### Command Execution Security
*   Exclusively execute shell commands defined in the allowlist (`server/lib/allowlist.ts`):
    *   Allowed base commands: `dokku`, `top`, `free`, `df`, `grep`, `awk`, `curl`.
    *   Validate multi-stage commands separated by pipes (`|`) by validating each part of the pipeline.
