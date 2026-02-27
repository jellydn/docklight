# Technology Stack

**Analysis Date:** 2026-02-27

## Languages
**Primary:**
- TypeScript ~5.9.3 (client), ^5.3.2 (server) - Full-stack language for both client and server
**Secondary:**
- CSS - Styling via Tailwind CSS utility classes
- HTML - Client templates (index.html, JSX)

## Runtime
**Environment:**
- Node.js 20 (Alpine) - Production runtime (per Dockerfile)
- Bun - Local development task runner (justfile, bun.lock present)
**Package Manager:**
- Bun (primary, used in justfile and dev workflow)
- npm (fallback, used in Dockerfile builds)
- Lockfiles: `bun.lock` present in both `server/` and `client/`

## Frameworks
**Core:**
- Express ^4.18.2 - Server HTTP framework (REST API + static file serving)
- React ^19.2.0 - Client UI framework (SPA)
- React Router DOM ^7.13.1 - Client-side routing (BrowserRouter)
- Tailwind CSS 3 - Utility-first CSS framework
**Testing:**
- None configured in client or server (dev-browser skill uses Vitest separately)
**Build/Dev:**
- Vite ^7.3.1 - Client bundler and dev server (port 5173, proxies `/api` to 3001)
- @vitejs/plugin-react ^5.1.1 - React Fast Refresh for Vite
- tsc (TypeScript compiler) - Server build (`commonjs` output to `dist/`)
- tsx ^4.6.2 - Server dev runner with watch mode
- PostCSS ^8.5.6 + Autoprefixer ^10.4.27 - CSS processing pipeline
- Biome ^2.4.4 - Linter and formatter (both client and server)
- ESLint ^9.39.1 - Legacy linter config in client (being replaced by Biome)

## Key Dependencies
**Critical:**
- better-sqlite3 ^12.6.2 - Embedded SQLite database for command history persistence
- jsonwebtoken ^9.0.3 - JWT-based session authentication (24h expiry, httpOnly cookies)
- ws ^8.19.0 - WebSocket server for real-time log streaming from Dokku apps
- cookie-parser ^1.4.7 - Cookie parsing middleware for JWT session tokens
**Infrastructure:**
- child_process (Node built-in) - Shell command execution to Dokku CLI

## Configuration
**Environment:**
- `PORT` - Server port (default: 3001)
- `DOCKLIGHT_PASSWORD` - Login password (required for production)
- `DOCKLIGHT_SECRET` - JWT signing secret (has insecure default)
- `NODE_ENV` - Controls secure cookie flag
- No `.env` file or `.env.example` present
**Build:**
- `server/tsconfig.json` - Server TS config (ES2022, commonjs, strict)
- `client/tsconfig.app.json` - Client TS config (ES2022, ESNext modules, react-jsx)
- `client/vite.config.ts` - Vite config with API proxy to localhost:3001
- `client/tailwind.config.js` - Tailwind content paths
- `client/postcss.config.js` - PostCSS with Tailwind + Autoprefixer
- `server/biome.json` / `client/biome.json` - Biome linter/formatter (tabs, double quotes, semicolons)

## Platform Requirements
**Development:**
- Node.js 20+
- Bun (for task running and dependency management)
- just (justfile task runner, optional convenience)
**Production:**
- Linux VPS with Dokku installed (same host)
- Docker (multi-stage Dockerfile provided)
- Node.js 20 Alpine (runtime container)
- SQLite-compatible filesystem (for `data/docklight.db`)

---
*Stack analysis: 2026-02-27*
