# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**
- TypeScript 5.3.2 (server) - Node.js backend with Express
- TypeScript 5.9.3 (client) - React frontend with Vite

## Runtime

**Environment:**
- Node.js 20+ (via Bun package manager)
- Docker/Dokku (deployment target)

**Package Manager:**
- Bun 1.x
- Lockfile: `bun.lock` (server), `client/bun.lock`

## Frameworks

**Core Backend:**
- Express 5.0.0 - Web server and API routing
- TypeScript 5.3.2 - Type safety
- node-ssh 13.2.1 - SSH connection pool for Dokku commands

**Core Frontend:**
- React 19.2.0 - UI framework
- React Router DOM 7.13.1 - Client-side routing
- Vite 7.3.1 - Build tool and dev server

**Testing:**
- Vitest 4.0.0 - Unit and integration test runner
- @vitest/coverage-v8 - Code coverage reporting
- Supertest 7.0.0 - HTTP endpoint testing (server)
- @testing-library/react 16.3.2 - Component testing (client)
- Playwright 1.58.2 - E2E testing (client)

**Build/Dev:**
- tsx 4.6.2 - TypeScript execution for development
- Biome 2.4.4 - Linting and formatting
- Tailwind CSS 4 - Styling
- @tailwindcss/postcss 4.2.1 - Tailwind PostCSS integration

## Key Dependencies

**Critical Backend:**
- better-sqlite3 12.6.2 - Embedded database for users, audit logs, settings
- jsonwebtoken 9.0.3 - JWT session authentication
- pino 10.3.1 - Structured logging
- pino-http 11.0.0 - HTTP request logging
- ws 8.19.0 - WebSocket for live log streaming
- express-rate-limit 8.2.1 - Rate limiting middleware
- cookie-parser 1.4.7 - Cookie parsing for sessions

**Critical Frontend:**
- @tanstack/react-query 5.90.21 - Server state management and caching
- zod 4.3.6 - Runtime type validation and API schemas
- lucide-react 0.577.0 - Icon library
- sonner 2.0.7 - Toast notifications
- @radix-ui/react-dialog 1.1.15 - Accessible dialog components
- @radix-ui/react-slot 1.2.4 - Component composition primitives
- class-variance-authority 0.7.1 - Component variant management
- tailwind-merge 3.5.0 - Tailwind class merging utilities

## Configuration

**Environment:**
- `.env` files for local development (see `server/.env.example`)
- Environment variables for production secrets

**Build:**
- `server/tsconfig.json` - TypeScript config for backend
- `client/tsconfig.json` - TypeScript config for frontend
- `biome.json` - Shared linting/formatting rules
- `justfile` - Task runner commands (alternative to npm scripts)

## Platform Requirements

**Development:**
- Bun 1.x or Node.js 20+
- macOS/Linux/WSL2

**Production:**
- Docker via Dokku
- VPS with SSH access
- 512MB+ RAM recommended

---

*Stack analysis: 2026-03-11*
