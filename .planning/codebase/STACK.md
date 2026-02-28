# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.x - Server and client code
- React 19.x - Frontend framework

**Secondary:**
- Shell - Dokku command execution via SSH

## Runtime

**Environment:**
- Node.js (server), Browser (client)

**Package Manager:**
- Bun (primary, for dev)
- npm (fallback compatible)
- Lockfile: `bun.lock` (server), `package-lock.json` not used

## Frameworks

**Core:**
- Express 4.18.x - Backend API server (`server/`)
- React 19.2.x - Frontend UI (`client/`)
- React Router 7.x - Client-side routing
- Vite 7.x - Frontend build tool and dev server

**Testing:**
- Vitest 2.x - Test runner (server only)
- Supertest 7.x - HTTP endpoint testing

**Build/Dev:**
- TypeScript 5.x - Type checking
- tsx 4.x - TypeScript execution for server dev
- Biome 2.4.x - Linting and formatting
- Tailwind CSS 3.x - Utility-first CSS framework

## Key Dependencies

**Critical:**
- better-sqlite3 12.x - SQLite database for command history (`server/lib/db.ts`)
- express 4.18.x - HTTP server (`server/index.ts`)
- react 19.2.x - UI framework
- jsonwebtoken 9.x - JWT authentication (`server/lib/auth.ts`)
- ws 8.19.x - WebSocket server for live logs (`server/lib/websocket.ts`)

**Infrastructure:**
- pino 10.x - Structured logging
- pino-http 11.x - HTTP request logging middleware
- cookie-parser 1.4.x - Cookie parsing for session auth

**UI:**
- @radix-ui/* - Accessible component primitives (dialog, slot)
- class-variance-authority - Component variant management
- clsx + tailwind-merge - Conditional className utilities
- sonner 2.x - Toast notifications
- lucide-react 0.575.x - Icons

## Configuration

**Environment:**
- `DOCKLIGHT_PASSWORD` (required) - Admin login password
- `DOCKLIGHT_SECRET` (optional, auto-generated) - JWT signing secret
- `DOCKLIGHT_DOKKU_SSH_TARGET` (recommended) - SSH target for Dokku commands
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` (optional) - Dedicated SSH target for root commands
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` (optional) - SSH key path for Dokku
- `PORT` (optional, default 3001) - Server port

**Build:**
- `server/tsconfig.json` - TypeScript config for server
- `client/tsconfig.json` (via Vite) - TypeScript config for client
- `server/biome.json` - Shared lint/format config
- `client/vite.config.ts` referenced but uses default Vite config

## Platform Requirements

**Development:**
- Node.js 20+ or Bun
- SSH access to a Dokku server (for integration testing)

**Production:**
- Dokku server with Docker
- VPS with SSH access
- Recommended: Cloudflare Zero Trust or Tailscale for additional security

---

*Stack analysis: 2026-02-28*
