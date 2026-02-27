# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.x - Backend and frontend application code in `server/**/*.ts` and `client/src/**/*.tsx`; compiler configs in `server/tsconfig.json` and `client/tsconfig.app.json`

**Secondary:**
- JavaScript (ESM config) - Frontend/build tooling configs in `client/vite.config.ts`, `client/tailwind.config.js`, and `client/postcss.config.js`

## Runtime

**Environment:**
- Node.js 20 (containerized) - Multi-stage Docker build and runtime use `node:20-alpine` in `Dockerfile`

**Package Manager:**
- Bun (developer workflow) - Install/run scripts via `justfile`, `server/package.json`, and `client/package.json`
- Lockfile: present (`server/bun.lock`, `client/bun.lock`)

## Frameworks

**Core:**
- Express 4.18.x - HTTP API and static SPA serving in `server/index.ts` with dependency in `server/package.json`
- React 19.x + React Router 7.x - SPA UI and routing in `client/src/main.tsx`, `client/src/App.tsx`, and dependency pins in `client/package.json`
- Dokku CLI integration layer - App/database/domain/SSL operations executed from `server/lib/apps.ts`, `server/lib/databases.ts`, `server/lib/domains.ts`, `server/lib/ssl.ts`

**Testing:**
- No test framework configured for app packages - `server/package.json` and `client/package.json` do not define `test` scripts

**Build/Dev:**
- Vite 7.x - Frontend dev server and build in `client/package.json` and `client/vite.config.ts`
- TypeScript compiler (`tsc`) - Backend and frontend type/build scripts in `server/package.json` and `client/package.json`
- tsx 4.x - Backend dev watch mode in `server/package.json`
- Biome 2.x - Lint/format in `server/package.json`, `client/package.json`, `server/biome.json`, and `client/biome.json`
- Tailwind CSS 3 + PostCSS + Autoprefixer - Styling toolchain in `client/package.json`, `client/tailwind.config.js`, and `client/postcss.config.js`

## Key Dependencies

**Critical:**
- `express` - API server and routing backbone (`server/package.json`, `server/index.ts`)
- `better-sqlite3` - Local command-history persistence (`server/package.json`, `server/lib/db.ts`)
- `jsonwebtoken` + `cookie-parser` - Session auth cookie + JWT verification (`server/package.json`, `server/lib/auth.ts`, `server/index.ts`)
- `ws` - Real-time log streaming over WebSocket (`server/package.json`, `server/lib/websocket.ts`)
- `react`/`react-dom`/`react-router-dom` - Client rendering and routing (`client/package.json`, `client/src/main.tsx`, `client/src/App.tsx`)

**Infrastructure:**
- `pino` + `pino-http` - Structured backend/client logging (`server/package.json`, `server/lib/logger.ts`, `client/src/lib/logger.ts`)
- Built-in Node `child_process` - Shell execution bridge to Dokku/system commands (`server/lib/executor.ts`, `server/lib/server.ts`)

## Configuration

**Environment:**
- Runtime is env-var driven (`DOCKLIGHT_PASSWORD`, `DOCKLIGHT_SECRET`, `PORT`, `NODE_ENV`, `LOG_LEVEL`) in `server/lib/auth.ts`, `server/index.ts`, and `server/lib/logger.ts`
- Deployment and required vars documented in `README.md` and `docs/deployment.md`

**Build:**
- Backend TS build config: `server/tsconfig.json`
- Frontend TS/Vite configs: `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json`, `client/vite.config.ts`
- Container build/runtime: `Dockerfile`

## Platform Requirements

**Development:**
- Bun toolchain expected for local workflows (`justfile`, `README.md`)
- Local Dokku CLI presence is required for backend command execution paths (`server/lib/executor.ts`, `server/lib/allowlist.ts`)

**Production:**
- Target is Dokku-hosted deployment using Docker image build and healthcheck (`docs/deployment.md`, `Dockerfile`, `app.json`, `Procfile`)

---

*Stack analysis: 2026-02-27*
