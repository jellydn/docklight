# Docklight Technology Stack

## Backend

### Runtime
- **Node.js**: Runtime environment (version 20+)
- **TypeScript**: Primary language (version 5.x)
  - Compiler: `tsc` (TypeScript Compiler)
  - Transpiler: `tsx` for TypeScript execution
  - Module system: CommonJS (server), ES modules (client)
  - Target: ES2022

### Framework
- **Express**: Web framework for backend API (version 5.0.0)
  - HTTP server: `http` module (built-in)
  - Middleware: Cookie parser, JSON body parser
  - HTTPS redirect middleware (production only)
  - Static file serving

### Database
- **SQLite**: Embedded database (via better-sqlite3)
  - Version: 12.6.2
  - Type definitions: `@types/better-sqlite3`
  - Prepared statements for security
  - Multiple tables: users, command_history, audit_log
  - Automatic table creation with `IF NOT EXISTS`
  - Indexes for performance

### Authentication
- **JWT (jsonwebtoken)**: Token-based authentication
  - Version: 9.0.3
  - Token expiration: 24 hours
  - Scrypt password hashing (crypto module)
  - Session management via cookies
  - HTTP-only, secure cookies in production

### Real-time Communication
- **WebSocket**: Log streaming (via ws package)
  - Version: 8.19.0
  - Connection pooling per SSH target
  - Idle timeout handling
  - Per-user connection limits

### SSH Execution
- **node-ssh**: SSH client for executing Dokku commands
  - Version: 13.2.1
  - Persistent connection pool
  - Retry logic for connection failures
  - Command timeout handling

### Security
- **Express Rate Limiter**: API rate limiting (version 8.2.1)
  - User-based rate limiting
  - Command execution rate limiting

### Logging
- **Pino**: High-performance logging
  - Version: 10.3.1 (server), 10.3.1 (client)
  - Pino HTTP middleware for request logging
  - Structured logging with context

### Utility Libraries
- **cookie-parser**: Cookie parsing
- **path**: Path manipulation (built-in)
- **crypto**: Password hashing, JWT signing
- **child_process**: Spawning shell commands
- **net**: WebSocket upgrade handling

## Frontend

### Runtime
- **Bun**: JavaScript runtime and package manager (for development)
- **Node.js**: JavaScript runtime (version 24-alpine in Docker)
  - Type definitions: `@types/node`

### Framework
- **React**: UI framework (version 19.2.0)
  - Hooks: `useState`, `useEffect`, `useContext`, `lazy`, `Suspense`
  - DOM rendering
  - Strict mode enabled

### Routing
- **React Router**: Client-side routing (version 7.13.1)
  - BrowserRouter
  - Route configuration with lazy loading
  - Authenticated routes with RequireAdmin component

### Styling
- **Tailwind CSS v4**: Utility-first CSS framework
  - Version: 4
  - PostCSS: 8.5.6
  - @tailwindcss/postcss for v4
  - Dark mode support (class-based)
  - Custom color system with CSS variables

### UI Components
- **Radix UI**: Accessible component primitives
  - Dialog (1.1.15)
  - Slot (1.2.4)

- **shadcn/ui**: UI component library (via Radix UI)
  - Sonner: Toast notifications (2.0.7)

### State & Validation
- **Zod**: Schema validation (version 4.3.6)
- **React Context**: Authentication state management

### Utilities
- **clsx**: Conditional class names (2.1.1)
- **tailwind-merge**: Merging Tailwind classes (3.5.0)
- **class-variance-authority**: Component variants (0.7.1)
- **lucide-react**: Icon library (0.576.0)

### Build Tool
- **Vite**: Build tool and dev server
  - Version: 7.3.1
  - Plugin: @vitejs/plugin-react
  - Server proxy: `/api` to `http://localhost:3001`
  - Path alias: `@` → `src/`

### Testing Frameworks
- **Vitest**: Testing framework (server and client)
  - Server: Version 4.0.0 (v8 coverage)
  - Client: Version 4.0.18
  - Environment: Node (server), jsdom (client)
  - Coverage: @vitest/coverage-v8

- **Testing Library**: React component testing
  - @testing-library/react (16.3.2)
  - @testing-library/jest-dom (6.9.1)
  - @testing-library/user-event (14.6.1)

- **Playwright**: End-to-end testing
  - Version: 1.58.2
  - UI mode for debugging
  - Chromium browser with dependencies

- **jsdom**: DOM simulation for client tests
- **happy-dom**: Lightweight DOM implementation

### Code Quality
- **Biome**: Linter and formatter
  - Server: 2.4.4
  - Client: 2.4.4
  - Style: Tab indentation, 2 spaces, 100 chars line width
  - Quotes: Double quotes, semicolons always
  - Remove unused variables (warn)

## DevOps & Deployment

### Docker
- **Docker**: Containerization
  - Multi-stage builds (client + server)
  - Node 24-alpine base images
  - SSH client installation in container
  - Exposed port: 3001 (configurable)

### Platform as a Service
- **Dokku**: PaaS platform for deployment
  - App creation via CLI
  - Buildpack-based deployments
  - SSL/HTTPS with Let's Encrypt plugin
  - Volume mounting for persistent data

### CI/CD
- **GitHub Actions**: CI/CD pipeline
  - CI workflow: `.github/workflows/ci.yml`
    - Typecheck (server + client)
    - Lint (biome)
    - Test (vitest + playwright)
    - Artifact upload for Playwright reports
  - Deploy production: `.github/workflows/deploy-production.yml`
    - SSH key-based deployment
    - Zero-downtime deploy
  - Deploy staging: `.github/workflows/deploy-staging.yml`
    - PR-based staging deployment
    - Comments PR with staging URL

### Configuration Management
- **Bun**: Package manager and runtime (for development)
- **npm**: Package manager (for Docker builds)
- **just**: Task runner (72 commands available)

## Development Tools

### Code Formatting
- **Biome**: Linter and formatter (identical config in server and client)
- TypeScript strict mode enabled

### Version Control
- **Git**: Version control (via GitHub Actions)
- Renovate: Automatic dependency updates (config: `config:recommended`)

### Documentation
- **Markdown**: Documentation format
- Inline comments (minimal, code should be self-documenting)

## Architecture Summary

```
┌─────────────────┐
│  Browser (SPA)  │
│  React 19 +     │
│  Vite dev       │
└────────┬────────┘
         │ Vite dev server (proxy /api -> localhost:3001)
         ↓
┌─────────────────┐
│  Express API    │
│  Server (Node)  │
│  + TypeScript   │
└────────┬────────┘
         │ HTTP + WebSocket
         ↓
┌─────────────────┐
│  SQLite DB      │
│  better-sqlite3 │
└────────┬────────┘
         │ SSH
         ↓
┌─────────────────┐
│  Dokku CLI      │
│  on VPS         │
└─────────────────┘
```

## Environment Variables

- `JWT_SECRET`: JWT signing secret (required in production)
- `DOCKLIGHT_DOKKU_SSH_TARGET`: SSH target for Dokku commands
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH`: SSH private key path
- `DOCKLIGHT_DOKKU_SSH_OPTS`: Extra SSH options
- `DOCKLIGHT_DB_PATH`: SQLite database path (default: data/docklight.db)
- `PORT`: Server port (default: 3001)
- `WS_MAX_CONNECTIONS`: WebSocket max connections (default: 50)
- `WS_MAX_CONNECTIONS_PER_USER`: Per-user limit (default: 5)
- `WS_IDLE_TIMEOUT_MS`: WebSocket idle timeout (default: 30 minutes)
- `WS_CLEANUP_INTERVAL_MS`: Cleanup interval (default: 1 minute)
- `NODE_ENV`: Node environment (development/production)
- `LOG_LEVEL`: Logging level (default: info)
