# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- TypeScript 5.3.2 (server) / 5.9.3 (client) - Entire codebase
- TSX for React components

**Secondary:**
- SQL - SQLite queries and schema
- Shell commands - Dokku CLI wrapper

## Runtime

**Environment:**
- Node.js 25.0.0 (via @types/node)
- Bun for package management and script execution

**Package Manager:**
- Bun 1.x
- Lockfile: bun.lockb (binary format)

## Frameworks

**Core:**
- Express 5.0.0 - HTTP server (server)
- React 19.2.0 - UI framework (client)
- Vite 7.3.1 - Build tool and dev server (client)
- React Router 7.13.1 - Client-side routing

**Testing:**
- Vitest 4.0.0 - Test runner (both)
- @vitest/coverage-v8 4.0.0 - Code coverage
- Testing Library 16.3.2 - React component testing
- Supertest 7.0.0 - HTTP endpoint testing

**Build/Dev:**
- tsx 4.6.2 - TypeScript execution (server)
- TypeScript 5.3.2/5.9.3 - Type checking
- Biome 2.4.4 - Linting and formatting
- Tailwind CSS 4 - Styling framework

## Key Dependencies

**Critical:**
- better-sqlite3 12.6.2 - Synchronous SQLite for data persistence
- node-ssh 13.2.1 - SSH connections to Dokku server
- jsonwebtoken 9.0.3 - JWT authentication tokens
- ws 8.19.0 - WebSocket for real-time log streaming
- pino 10.3.1 - Structured logging

**Infrastructure:**
- express-rate-limit 8.2.1 - API rate limiting
- cookie-parser 1.4.7 - Cookie parsing middleware
- Radix UI - Accessible component primitives
- zod 4.3.6 - Schema validation

## Configuration

**Environment:**
- `.env` file for local development
- `.env.example` template provided
- Required: `JWT_SECRET`, `DOCKLIGHT_DOKKU_SSH_TARGET`, `DOCKLIGHT_DOKKU_SSH_KEY_PATH`
- Optional: `LOG_LEVEL`, `DOCKLIGHT_DB_PATH`

**Build:**
- `server/tsconfig.json` - Backend TypeScript config (CommonJS, strict)
- `client/tsconfig.json` - Frontend TypeScript config (ESNext, strict)
- `client/vite.config.ts` - Vite bundler configuration
- `biome.json` - Code style and linting rules (both)

## Platform Requirements

**Development:**
- Bun runtime for package management
- Node.js for production server execution
- SSH access to Dokku server
- SQLite 3 support

**Production:**
- Docker container (Dockerfile provided)
- Any Linux distribution with Node.js
- Persistent volume for SQLite database
- SSH keys for Dokku communication

---

*Stack analysis: 2026-03-02*
