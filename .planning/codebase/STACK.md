# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.3.2 (server) - Backend API and business logic
- TypeScript 5.9.3 (client) - Frontend React application

**Secondary:**
- JavaScript (generated) - Build output and runtime

## Runtime

**Environment:**
- Node.js 25.0.0 (server)
- Browser (client) - Modern browsers via Vite

**Package Manager:**
- Bun (latest) - Fast package manager and runtime
- Lockfile: `bun.lock` present

**Bun Scripts:**
```bash
bun run dev              # Development server
bun run build            # Production build
bun run typecheck        # Type checking
bun run lint             # Biome linting
bun run test             # Vitest tests
```

## Frameworks

**Core:**
- Express 5.0.0 - Backend web framework
- React 19.2.0 - Frontend UI framework
- React Router DOM 7.13.1 - Client-side routing
- Vite 7.3.1 - Frontend build tool and dev server
- Better-SQLite3 12.6.2 - Embedded database

**Testing:**
- Vitest 4.0.0 - Test runner (both client and server)
- @vitest/coverage-v8 4.0.0 - Code coverage
- Supertest 7.0.0 - HTTP endpoint testing
- Testing Library - React component testing

**Build/Dev:**
- tsx 4.6.2 - TypeScript execution for development
- Biome 2.4.4 - Linting and formatting
- TypeScript 5.3.2/5.9.3 - Type checking
- Tailwind CSS 4 - Styling framework

## Key Dependencies

**Critical:**
- node-ssh 13.2.1 - SSH connections for remote Dokku commands
- express-rate-limit 8.2.1 - API rate limiting
- jsonwebtoken 9.0.3 - JWT authentication
- pino 10.3.1 - Structured logging
- ws 8.19.0 - WebSocket server for log streaming

**Infrastructure:**
- cookie-parser 1.4.7 - Cookie parsing for auth
- zod 4.3.6 - Schema validation (client)
- class-variance-authority 0.7.1 - Component variants
- clsx 2.1.1 + tailwind-merge 3.5.0 - Class utilities

**UI Components:**
- @radix-ui/react-dialog 1.1.15 - Dialog component
- @radix-ui/react-slot 1.2.4 - Slot composition
- lucide-react 0.575.0 - Icon library
- sonner 2.0.7 - Toast notifications

## Configuration

**Environment:**
- `.env` files for configuration (not in git)
- Key configs: `server/tsconfig.json`, `client/tsconfig.json`, `biome.json`

**Required Environment Variables:**
- `DOCKLIGHT_SECRET` - JWT signing secret (required)
- `DOCKLIGHT_PASSWORD` - Admin password (required for auth)
- `DOCKLIGHT_DOKKU_SSH_TARGET` - Default SSH target (e.g., `dokku@server`)
- `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` - Root user SSH target for sudo commands
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH` - Path to SSH private key
- `DOCKLIGHT_DOKKU_SSH_OPTS` - Additional SSH options
- `CACHE_TTL` - Cache TTL in milliseconds (default: 30000)
- `LOG_LEVEL` - Logging level (default: "info")
- `PORT` - Server port (default: 3001)

**Build:**
- `server/vitest.config.ts` - Vitest configuration
- `client/vitest.config.ts` - Vitest configuration
- `client/vite.config.ts` - Vite build configuration
- `client/tailwind.config.js` - Tailwind CSS configuration

## Platform Requirements

**Development:**
- Bun runtime
- Node.js 25+ compatibility
- SSH access to Dokku server for testing

**Production:**
- Node.js 25+ runtime
- SSH key access to Dokku server
- SQLite support (built-in)
- Docker support (via Dockerfile)

---
*Stack analysis: 2026-02-28*
