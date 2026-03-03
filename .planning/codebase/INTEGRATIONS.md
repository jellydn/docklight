# Docklight External Integrations

## Dokku Platform

### Type: Platform as a Service (PaaS)
**Description**: Self-hosted PaaS platform that deploys and manages applications. Docklight wraps Dokku CLI commands to provide a web UI for managing Dokku deployments.

### Configuration
- **Dokku SSH Target**: `DOCKLIGHT_DOKKU_SSH_TARGET`
  - Format: `user@host`, `user@host:port`, `user@[ipv6]`, `ssh://user@host:port`
  - Example: `dokku@95.111.232.131`
  - Implemented in: `/server/lib/executor.ts`

- **SSH Private Key**: `DOCKLIGHT_DOKKU_SSH_KEY_PATH`
  - Path to SSH private key inside container
  - Mounting recommended via: `dokku storage:mount docklight /home/dokku/.ssh/docklight:/app/.ssh/id_ed25519`

- **SSH Options**: `DOCKLIGHT_DOKKU_SSH_OPTS`
  - Default: `-o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10`

### SSH Client Implementation
- **Library**: `node-ssh` (version 13.2.1)
- **Connection Pool**: `SSHPool` class maintains persistent SSH connections
  - IDLE_TIMEOUT_MS: 5 minutes
  - Retry logic for connection failures
  - Channel error retry (SSH channel failures trigger reconnection)
- **Command Execution**: Via SSH execution (`sshPool.execCommand()`)

### Supported Dokku Commands
#### Apps Management
- `apps:list`, `apps:create`, `apps:destroy`
- `ps:report`, `ps:restart`, `ps:stop`, `ps:start`, `ps:rebuild`, `ps:scale`
- `ps:status` (via apps:report)

#### Configuration
- `config:show`, `config:set`, `config:unset`

#### Domains
- `domains:report`, `domains:add`, `domains:remove`

#### Logs
- `logs <app> -t -n <lines>` (via WebSocket streaming)

#### Databases
- `plugin:list`, `<plugin>:list`, `<plugin>:links`
- `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy`

#### Plugins
- `plugin:list`, `plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`

#### SSL
- `letsencrypt:report`, `letsencrypt:ls`, `certs:report`
- `letsencrypt:set <app> email <email>`
- `letsencrypt:enable`, `letsencrypt:auto-renew`

### Integration Points
- **Dokku SSH Access**: Container uses SSH to execute Dokku CLI commands
- **Dokku Storage**: Persistent storage mounted for database persistence
- **Dokku Let's Encrypt**: SSL/TLS certificate management
- **Dokku CLI**: Dokku commands executed via SSH from container

## Docker

### Type: Container Runtime
**Description**: Used for both containerizing Docklight itself and for running Dokku's managed applications.

### Container Configuration
- **Base Image**: `node:24-alpine`
- **SSH Client**: Installed via `apk add --no-cache openssh-client`
- **Multi-stage Build**:
  1. `client-build`: Build React app with Vite
  2. `server-build`: Build Express server with TypeScript
  3. `final-runtime`: Combine both with production dependencies

### Environment Variables
- `PORT`: Exposed port (default: 3001)
- `NODE_ENV`: Runtime environment

### Persistent Storage
- Database storage: `/app/data/docklight.db` (mountable via `dokku storage:mount`)

## Let's Encrypt (SSL/TLS)

### Type: Certificate Authority
**Description**: Automatic SSL certificate issuance and renewal for secure HTTPS connections.

### Configuration
- **Plugin**: `dokku-letsencrypt` (installed via `dokku plugin:install`)
- **Email**: Configured via `letsencrypt:set docklight email`
- **Enabled**: `letsencrypt:enable docklight`

### Integration
- **SSL Termination**: Dokku handles SSL termination on the edge
- **Certificate Renewal**: Automatic via `letsencrypt:auto-renew` cron job
- **HTTPS Redirect**: Docklight server enforces HTTPS in production via middleware

### Integration Points
- **Dokku SSL Plugin**: Manages certificate issuance and renewal
- **Docklight HTTPS Middleware**: Enforces HTTPS in production environment

## GitHub Actions

### Type: CI/CD Platform
**Description**: GitHub Actions workflows for testing, linting, and deploying the application.

### Workflows
#### CI Workflow (`.github/workflows/ci.yml`)
- **Typecheck**: Both server and client TypeScript compilation
- **Lint**: Biome linter for both projects
- **Test**: Vitest for server, Vitest for client (with coverage)
- **E2E Tests**: Playwright for end-to-end testing

#### Deploy Production (`.github/workflows/deploy-production.yml`)
- **Trigger**: Push to main branch
- **Deployment Method**: SSH-based push to Dokku production
- **Zero-downtime**: Automatic redeploy via Dokku
- **Notification**: Simple echo message with deployment URL

#### Deploy Staging (`.github/workflows/deploy-staging.yml`)
- **Trigger**: Pull request opened/synced/reopened
- **Deployment Method**: SSH-based push to Dokku staging
- **PR Comment**: Automatically comments PR with staging URL
- **Notification**: GitHub Script updates PR comment with staging URL

### GitHub Secrets
- `DOKKU_SSH_KEY`: SSH private key for deployment (ed25519 format)
- `DOKKU_HOST`: Dokku server IP or hostname
- `JWT_SECRET`: Production JWT signing secret (managed by Dokku config)
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH`: Path to SSH key inside container
- `DOCKLIGHT_DOKKU_SSH_TARGET`: SSH target for Dokku commands
- `DOCKLIGHT_DOKKU_SSH_OPTS`: SSH options

### Integration Points
- **Git**: Version control with GitHub
- **SSH**: SSH key-based deployment
- **Dokku**: PaaS deployment target
- **GitHub Script**: PR comment automation
- **Artifacts**: Playwright test reports

## Authentication (Custom)

### Type: Custom Authentication System
**Description**: Multi-user authentication with role-based access control (RBAC).

### Features
- **Username/Password Authentication**: Basic credentials
- **Password Hashing**: Scrypt (bcrypt-compatible)
- **JWT Tokens**: Session management with 24-hour expiration
- **Role-Based Access Control**: Three roles
  - `admin`: Full system access
  - `operator`: Limited app management
  - `viewer`: Read-only access
- **Session Management**: HTTP-only, secure cookies

### Implementation
- **JWT Library**: `jsonwebtoken` (version 9.0.3)
- **Password Hashing**: Node.js `crypto` module (scrypt)
- **Token Validation**: Middleware (`authMiddleware`)
- **Role Enforcement**: `requireRole` and `requireAdmin` middlewares
- **Cookie Management**: `setAuthCookie` and `clearAuthCookie` functions

### Integration Points
- **Database**: User accounts stored in SQLite
- **API Routes**: Protected via middleware
- **User Management**: CRUD operations via `/api/users` endpoints
- **Audit Logs**: User actions tracked for compliance

## Git

### Type: Version Control
**Description**: Git-based version control with remote hosting on GitHub.

### Integration Points
- **Source Code**: Hosted on GitHub repository
- **CI/CD Triggers**: Push and pull request events
- **Deployment Remote**: Dokku SSH remote for deployments
- **Branching**: Main branch for production, staging via PRs

### Git Configuration
- **Remote**: `dokku` (production), `staging` (staging environment)
- **Branching Strategy**: Git Flow (main branch for production)
- **Remote URL Format**: `dokku@<host>:<app-name>`

## SQLite

### Type: Embedded Database
**Description**: Local file-based database for storing users, command history, and audit logs.

### Tables
1. **users**: User accounts with password hashes and roles
2. **command_history**: Execution history of Dokku commands
3. **audit_log**: User action auditing

### Features
- **Prepared Statements**: Security via parameterized queries
- **Automatic Indexing**: Created on `createdAt`, `exitCode`, `command`
- **Transaction Support**: ACID transactions
- **Backup/Restore**: Export/import functionality
- **Audit Rotation**: Automatic cleanup of old logs

### Integration Points
- **Backend**: Centralized database for server application
- **Authentication**: User credentials and roles
- **Audit**: Command history and user actions
- **Backup**: `exportBackup()` and `importBackup()` functions

## Database Integration Summary

| Integration | Type | Purpose | Configuration |
|-------------|------|---------|---------------|
| Dokku | PaaS | Application hosting | SSH target, key path |
| Docker | Runtime | Containerization | Multi-stage build, alpine base |
| Let's Encrypt | SSL/TLS | HTTPS certificates | Email config, plugin installation |
| GitHub Actions | CI/CD | Testing & deployment | SSH key secrets, Dokku remote |
| Custom Auth | Authentication | Multi-user access | JWT tokens, role-based RBAC |
| Git | Version Control | Code management | GitHub remote, Dokku remote |
| SQLite | Database | Local storage | File-based, mountable storage |

## External Services (No Direct Integration)

The following services are recommended but not directly integrated:

1. **Cloudflare Zero Trust** (Optional): VPN-only access, firewall rules
2. **Tailscale** (Optional): Zero-trust networking, VPN-only access
3. **Monitoring Services** (Optional): Monitoring, alerting, metrics
4. **Log Aggregation** (Optional): Centralized logging services

## Authentication & Security

### Direct Integrations
- **Custom Authentication**: JWT-based with RBAC
  - No external auth provider
  - Self-hosted user management
  - Database-stored credentials

### Security Measures
- **Rate Limiting**: API and command execution limits
- **Command Allowlist**: Strict command execution restrictions
- **HTTPS Enforcement**: Production-only HTTPS redirect
- **HTTP-Only Cookies**: XSS protection
- **Scrypt Hashing**: Secure password storage
- **JWT Expiration**: Automatic session expiration
- **Audit Logging**: All actions tracked for compliance

## Deployment Integrations

### Dokku
- **SSH-based Deployments**: Push to Dokku remote
- **Zero-downtime Deploys**: Automatic container restarts
- **Buildpack System**: Automatic Docker image building
- **Health Checks**: `/api/health` endpoint for container health

### GitHub Actions
- **Automated Testing**: Typecheck, lint, test on every push
- **Automated Deployments**: Production and staging deployments
- **PR-based Staging**: Automatic staging preview on PRs
- **Artifact Upload**: Playwright test reports for debugging
