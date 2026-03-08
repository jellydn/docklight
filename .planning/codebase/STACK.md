# Technology Stack

**Analysis Date:** 2026-03-07

## Languages

**Primary:**
- TypeScript 5.x - Server (Express) and Client (React)
- JavaScript (ESM modules) - Some configs and runtime

**Secondary:**
- Shell - Bash scripts via justfile
- SQL - SQLite queries

## Runtime

**Environment:**
- Node.js 20+ (server)
- Bun 1.x (package manager, dev server)

**Package Manager:**
- Bun 1.x
- Lockfile: `bun.lockb` (binary)

## Frameworks

**Core:**
- Express 5.0.0 - Backend HTTP server
- React 19.2.0 - Frontend UI
- React Router DOM 7.13.1 - Client-side routing
- Vite 7.3.1 - Frontend build tool and dev server
- Tailwind CSS 4 - Styling

**Testing:**
- Vitest 4.0.0 - Unit and integration tests (server + client)
- Playwright 1.58.2 - E2E tests (client)
- @testing-library/react 16.3.2 - Component testing
- supertest 7.0.0 - HTTP endpoint testing

**Build/Dev:**
- Biome 2.4.4 - Linting and formatting
- tsx 4.6.2 - TypeScript execution for server
- @vitejs/plugin-react 5.1.1 - React support in Vite

## Key Dependencies

**Critical:**
- better-sqlite3 12.6.2 - Embedded SQLite database for audit logs and settings
- node-ssh 13.2.1 - SSH connection pool for executing Dokku commands remotely
- jsonwebtoken 9.0.3 - JWT authentication
- ws 8.19.0 - WebSocket server for live log streaming
- express-rate-limit 8.2.1 - API rate limiting

**Infrastructure:**
- pino 10.3.1 - Structured logging
- pino-http 11.0.0 - HTTP request logging middleware
- cookie-parser 1.4.7 - Cookie parsing for JWT sessions
- zod 4.3.6 - Runtime schema validation (client)
- @tanstack/react-query 5.90.21 - Server state management

**UI Components:**
- @radix-ui/react-dialog 1.1.15 - Dialog component
- @radix-ui/react-slot 1.2.4 - Slot component for composition
- lucide-react 0.577.0 - Icon library
- sonner 2.0.7 - Toast notifications
- class-variance-authority 0.7.1 - Component variant styling

## Configuration

**Environment:**
- `.env` files or environment variables
- Key configs required:
  - `JWT_SECRET` - JWT signing secret (required)
  - `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target (e.g., "dokku@server-ip")
  - `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
  - `DOCKLIGHT_DB_PATH` - SQLite database path (default: "data/docklight.db")
  - `LOG_LEVEL` - Logging level (default: "info")
  - `PORT` - Server port (default: 3001)

**Build:**
- `server/tsconfig.json` - Server TypeScript config
- `client/tsconfig.json` - Client TypeScript config with `@/` alias
- `server/vitest.config.ts` - Server test config with Node environment
- `client/vitest.config.ts` - Client test config with jsdom environment
- `client/playwright.config.ts` - E2E test config
- `justfile` - Task runner commands

## Platform Requirements

**Development:**
- Node.js 20+
- Bun 1.x
- SSH access to a Dokku server for testing

**Production:**
- Linux server with Dokku installed
- Docker (via Dokku)
- Node.js runtime for running Docklight itself

---

*Stack analysis: 2026-03-07*
