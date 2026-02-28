# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript ^5.3.2 (server) - Backend API and business logic
- TypeScript ~5.9.3 (client) - Frontend React components

**Secondary:**
- TSX for React components (client)
- JSON for configuration files

## Runtime

**Environment:**
- Node.js (Server: Bun runtime, Client: Vite dev server)

**Package Manager:**
- Bun
- Lockfiles: `bun.lockb` present in server/, client/, and .agents/skills/dev-browser/

## Frameworks

**Core:**
- Express ^5.0.0 - Backend web framework
- React ^19.2.0 - Frontend UI framework
- React Router DOM ^7.13.1 - Client-side routing
- Vite ^7.3.1 - Frontend build tool and dev server

**Testing:**
- Vitest ^4.0.0 - Test runner for both server and client
- @testing-library/react ^16.3.2 - React component testing
- @testing-library/user-event ^14.6.1 - User interaction simulation
- happy-dom ^20.7.0 - DOM environment for client tests
- Supertest ^7.0.0 - HTTP endpoint testing (server)

**Build/Dev:**
- Biome ^2.4.4 - Linting and formatting
- tsx ^4.6.2 - TypeScript execution for server dev
- TypeScript ^5.3.2 - Type checking (server)

## Key Dependencies

**Critical:**
- better-sqlite3 ^12.6.2 - Embedded SQLite database for command history
- pino ^10.3.1 + pino-http ^11.0.0 - Structured logging
- express-rate-limit ^8.2.1 - API rate limiting
- ws ^8.19.0 - WebSocket server for log streaming
- jsonwebtoken ^9.0.3 - JWT authentication
- zod ^4.3.6 - Runtime schema validation (client)

**Infrastructure:**
- cookie-parser ^1.4.7 - Cookie parsing for auth
- tailwindcss 4 + @tailwindcss/postcss ^4.2.1 - Utility-first CSS
- class-variance-authority ^0.7.1 - Component variant management
- Radix UI (@radix-ui/react-dialog, @radix-ui/react-slot) - Accessible component primitives
- lucide-react ^0.575.0 - Icon library
- sonner ^2.0.7 - Toast notifications

## Configuration

**Environment:**
- `.env` files for environment variables
- Key configs: `PORT` (default 3001), authentication password

**Build:**
- `server/tsconfig.json` - Server TypeScript config (strict mode, ES2022 target)
- `client/tsconfig.json` - Client TypeScript config with paths for @ alias
- `server/biome.json` - Shared linting/formatting config
- `client/vite.config.ts` - Vite build config with proxy to server

## Platform Requirements

**Development:**
- Bun runtime
- Node.js-compatible environment
- Dokku server access for integration testing

**Production:**
- Dokku host (self-hosted PaaS)
- SSH access to Dokku server
- Node.js runtime for server

---

*Stack analysis: 2026-02-28*
