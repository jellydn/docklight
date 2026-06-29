# Technology Stack

**Analysis Date:** 2026-06-29

## Languages

**Primary:**

- TypeScript 5.3.2 (server) - Node.js backend with Express
- TypeScript 5.9.3 (client) - React frontend with Vite

## Runtime

**Environment:**

- Node.js 24+ (final runtime Docker image uses `node:24-alpine`)
- Docker/Dokku (deployment target)

**Package Manager:**

- Bun 1.x (used for local dependency management and script execution)
- Lockfiles: `server/bun.lock`, `client/bun.lock` (Note: npm is used inside the final Dockerfile build stage)

## Frameworks

**Core Backend:**

- Express 5.0.0 - Web server and API routing
- Node-SSH 13.2.1 - SSH connection pool for executing Dokku commands
- WS 8.19.0 - WebSockets for streaming log outputs

**Core Frontend:**

- React 19.2.0 - UI component framework
- React Router DOM 7.13.1 - Client-side SPA routing
- Vite 8.0.0 - Build tool and dev server

**Testing:**

- Vitest 4.0.0 - Unit and integration test runner (shared server and client)
- Playwright 1.58.2 - E2E testing framework (client-side)
- Supertest 7.0.0 - HTTP endpoint integration tests (server-side)
- @testing-library/react 16.3.2 - React UI component test utilities

**Build/Dev:**

- tsx 4.6.2 - TypeScript execution engine for backend dev watches
- Biome 2.4.4 - Shared code style formatting and linting rules
- Tailwind CSS 4 - Utility-first CSS styling
- @tailwindcss/postcss 4.2.1 - Tailwind CSS PostCSS integration wrapper

## Key Dependencies

**Critical Backend:**

- better-sqlite3 12.6.2 - High-performance SQLite3 driver (prepared statements, WAL mode)
- jsonwebtoken 9.0.3 - JWT utility for secure session credentials
- pino 10.3.1 & pino-http 11.0.0 - Structured logging utilities
- express-rate-limit 8.2.1 - In-memory API request rate limiting
- cookie-parser 1.4.7 - Cookie parsing middleware

**Critical Frontend:**

- @tanstack/react-query 5.90.21 - Server state synchronization and asynchronous cache manager
- zod 4.3.6 - Schema validation and runtime type assertion helper
- lucide-react 1.0.0 - Clean icon component library
- sonner 2.0.7 - Lightweight toast notification system
- @radix-ui/react-dialog 1.1.15 - Headless dialog element configuration
- @radix-ui/react-slot 1.2.4 - UI element slot composition helper
- class-variance-authority 0.7.1 - Type-safe CSS class generation
- tailwind-merge 3.5.0 - Utility for merging duplicate Tailwind CSS utility rules

## Configuration

**Environment Configuration:**

- Local `.env` files (e.g. `server/.env.example` reference)
- App settings JSON file: `data/server-settings.json` (filesystem persistent cache)

**Build and Type Check Configurations:**

- `server/tsconfig.json` - Backend compiler directives
- `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json` - Client-side build targets
- `biome.json`, `client/biome.json`, `server/biome.json` - Code formatting preferences
- `justfile` - Standard project task automation recipes

## Platform Requirements

**Development Environment:**

- Bun 1.x or Node.js 20+
- macOS / Linux / WSL2 shell (required for executing ssh tasks)

**Production/Deployment Environment:**

- Docker (using multi-stage Dockerfile configuration)
- Dokku hosting instance (SSH accessible via `DOCKLIGHT_DOKKU_SSH_TARGET`)
- Recommended resource profile: 512MB RAM minimum
