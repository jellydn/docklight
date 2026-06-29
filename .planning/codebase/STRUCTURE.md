# Codebase Structure

**Analysis Date:** 2026-06-29

## Directory Layout

```
[project-root]/
├── server/                 # Express backend in TypeScript
│   ├── data/               # Persistent SQLite database (local dev / gitignored)
│   ├── lib/                # Core controllers, SSH execution, helpers, test utils
│   │   └── test-data/      # Raw output mock strings for unit test cases
│   ├── routes/             # Express API endpoints & middlewares
│   ├── createUser.ts       # CLI user creator script
│   ├── index.ts            # Main application entry point
│   ├── tsconfig.json       # TypeScript configuration
│   └── package.json        # Node dependency map (Bun-ready)
├── client/                 # React SPA frontend in TypeScript
│   ├── e2e/                # Playwright E2E automation test suite
│   ├── public/             # Static public assets (icons, images)
│   ├── src/                # Frontend application code
│   │   ├── assets/         # App-specific css or static image imports
│   │   ├── components/     # Shareable components (layout, dialogs, custom hooks)
│   │   │   └── ui/         # Shadcn-like primitive wrappers (Radix UI)
│   │   ├── contexts/       # React Context provider definitions (auth context)
│   │   ├── hooks/          # Domain-agnostic custom React Hooks
│   │   ├── lib/            # Types, constants, api handlers, validation schemas
│   │   ├── pages/          # Route page containers
│   │   │   └── AppDetail/  # Sub-pages and tabs for app configurations
│   │   ├── test/           # React component unit test boilerplate
│   │   ├── App.tsx         # Route router declarations
│   │   ├── index.css       # Core design utility rules & custom variables
│   │   └── main.tsx        # React mounting entry point
│   ├── vite.config.ts      # Vite dev / build configuration
│   └── package.json        # Frontend dependency manifest
├── docs/                   # Markdown developer documentation guides
├── justfile                # Just task runner definitions
├── biome.json              # Main lint/formatting options (Biome)
└── package.json            # Root configuration referencing workspaces
```

---

## Directory Purposes

### Server Directories

*   **[server/lib/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/)**: Core server capabilities. Houses the connection pool logic, parsing of SSH/stdout logs, SQLite setup, and rate limiters.
*   **[server/routes/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/)**: Exposes web-facing REST handlers. Implements route configurations like `/api/apps`, `/api/databases`, `/api/settings`, etc.
*   **[server/data/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/data/)**: Holds the SQLite database file (`docklight.db`). This folder and database are generated automatically upon starting the server.

### Client Directories

*   **[client/src/components/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/components/)**: Reusable controls and building blocks. The [ui/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/components/ui/) sub-folder contains generic headless components (radix primitives, buttons, dropdowns, inputs).
*   **[client/src/pages/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/)**: Container views mapped to React routes. The [AppDetail/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/AppDetail/) subdirectory is particularly important, hosting individual tabs for app setup (SSL, Ports, Docker options, Git, Domains, Buildpacks).
*   **[client/src/lib/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/lib/)**: Schema models (Zod definitions in `schemas.ts`), constants, fetch calls in `api.ts`, and caching keys (`query-keys.ts`).

---

## Naming Conventions

### File & Folder Naming
*   **Source Files:** Use kebab-case for all files and directories (e.g. `docker-options.ts`, `app-events.ts`).
*   **Test Files:** Place tests side-by-side with source code using `.test.ts` (for business logic) or `.test.tsx` (for components/pages) suffixes.
*   **Route Controller Prefixes:** App-specific controllers are prefixed with `app-` (e.g., `app-ports.ts`, `app-proxy.ts`).

### Code Symbol Naming
*   **Functions:** Use camelCase starting with verbs (e.g. `getApps()`, `verifyPassword()`, `broadcastAppEvent()`).
*   **Route Registrars:** Functions configuring route collections follow the `register*Routes` pattern (e.g. `registerAppRoutes()`).
*   **Classes & Interfaces:** Use PascalCase (e.g. `SSHPool`, `CommandResult`, `JWTPayload`).
*   **Constants:** SCREAMING_SNAKE_CASE (e.g. `ALLOWED_COMMANDS`, `DEFAULT_JWT_SECRET`, `MAX_CONNECTIONS`).

---

## Where to Add New Code

### 1. Adding a New API Endpoint / Backend Feature
1.  Add logic or shell execution to [server/lib/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/).
2.  Define the routes controller in [server/routes/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/).
3.  Register the routes in [server/routes/index.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/index.ts) and call it in [server/index.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/index.ts).
4.  Implement tests in `server/lib/<feature>.test.ts`.

### 2. Adding a New React Page or Route
1.  Create the page component in [client/src/pages/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/) using PascalCase filename.
2.  Import/lazy-load the page in [client/src/App.tsx](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/App.tsx) and mount the `<Route>` element.
3.  Implement corresponding queries/mutations using TanStack React Query inside hooks or inline.

### 3. Adding a New App Configuration Tab
1.  Create your sub-pane inside [client/src/pages/AppDetail/](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/AppDetail/) (e.g., `AppSSL.tsx`).
2.  Update the tab listings and render triggers in the main list in [client/src/pages/AppDetail/index.tsx](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/AppDetail/index.tsx).

---

## Output / Dev Artifacts (Ignored by Git)

*   **client/dist/**: Compiled client production-ready assets (generated via `bun run build`).
*   **server/dist/**: Compiled backend server javascript files.
*   **server/data/docklight.db**: Persistent local developer SQLite database.
