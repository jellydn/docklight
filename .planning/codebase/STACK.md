# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.3.2 (Server) - `/server/tsconfig.json`
- TypeScript 5.9.3 (Client) - `/client/tsconfig.json`
- JavaScript/JSX - Client React components

**Secondary:**
- Shell commands - Remote execution via SSH on Dokku server

## Runtime

**Environment:**
- Node.js (latest via Bun) - Server execution environment
- Bun runtime - Preferred package manager and script runner

**Package Manager:**
- Bun - Primary package manager for both server and client
- Lockfile: `bun.lockb` present in both `/server/` and `/client/`

## Frameworks

**Core:**
- Express 5.0.0 - Server HTTP framework (`/server/package.json`)
- React 19.2.0 - Client UI library (`/client/package.json`)
- React Router DOM 7.13.1 - Client routing (`/client/package.json`)

**Testing:**
- Vitest 4.0.0 - Test framework for both server and client
- Testing Library (React 16.3.2, Jest DOM 6.9.1, User Event 14.6.1) - Client testing
- Supertest 7.0.0 - Server API testing
- Happy DOM 20.7.0 / jsdom 28.1.0 - Client test environments

**Build/Dev:**
- Vite 7.3.1 - Client build tool and dev server (`/client/vite.config.ts`)
- tsx 4.6.2 - Server TypeScript execution watcher (`/server/package.json`)
- TypeScript compiler (tsc) - Type checking and compilation
- Biome 2.4.4 - Linting and formatting for both projects

**UI Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing (`/client/postcss.config.js`)
- Radix UI (Dialog 1.1.15, Slot 1.2.4) - Accessible component primitives
- Sonner 2.0.7 - Toast notifications
- Lucide React 0.575.0 - Icon library

## Key Dependencies

**Critical:**
- better-sqlite3 12.6.2 - Embedded SQLite database for command history, users, audit logs (`/server/lib/db.ts`)
- node-ssh 13.2.1 - SSH connection management for remote Dokku command execution (`/server/lib/executor.ts`)
- jsonwebtoken 9.0.3 - JWT-based authentication (`/server/lib/auth.ts`)
- ws 8.19.0 - WebSocket support for real-time updates
- Zod 4.3.6 - Runtime type validation (client)

**Infrastructure:**
- pino 10.3.1 - Structured logging (`/server/lib/logger.ts`)
- pino-http 11.0.0 - HTTP request logging middleware
- express-rate-limit 8.2.1 - API rate limiting
- cookie-parser 1.4.7 - Cookie parsing for auth tokens
- class-variance-authority 0.7.1 - Component variant management
- clsx 2.1.1 + tailwind-merge 3.5.0 - Conditional class utilities

**Utilities:**
- In-memory cache with TTL - Custom cache implementation (`/server/lib/cache.ts`)

## Configuration

**Environment:**
- Environment variables via `process.env`
- Server: `/server/tsconfig.json` (CommonJS modules, ES2022 target)
- Client: `/client/tsconfig.json` (ES modules with path aliases)

**Build:**
- Server: `tsc` to `/server/dist/` directory
- Client: `tsc -b && vite build` with Vite dev server on port 5173
- Both use Biome for linting/formatting with consistent settings (tabs, 100 char width, double quotes)

**Development:**
- Justfile commands for unified workflow (`/justfile`)
- Server dev: `tsx watch` on port 3001
- Client dev: Vite proxy to `/api` -> `http://localhost:3001`

## Platform Requirements

**Development:**
- Node.js with Bun runtime
- SSH access to Dokku server for testing remote commands
- Local SQLite database (auto-created in `/server/data/`)

**Production:**
- Self-hosted Dokku server deployment
- SSH key authentication for Git push deployment
- SQLite for persistent storage (command history, users, audit logs)
- Environment variables for configuration (see `/Users/huynhdung/src/tries/2026-03-01-jellydn-docklight-pr47/.planning/codebase/INTEGRATIONS.md`)

---

*Stack analysis: 2026-03-01*
