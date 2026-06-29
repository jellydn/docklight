# External Integrations

**Analysis Date:** 2026-06-29

## APIs & External Services

### Dokku CLI (via SSH)
- **Integration Mechanism:** SSH commands are executed remotely via the `node-ssh` library.
- **Implementation:**
  - Dynamic shell command builder: [dokku.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/dokku.ts)
  - Security command verification: [allowlist.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/allowlist.ts)
- **Authentication:** Authenticates to the Dokku host using SSH private key keys via `DOCKLIGHT_DOKKU_SSH_KEY_PATH`.

### Resend Email API
- **Integration Mechanism:** Native `fetch` HTTP client queries the Resend REST API endpoints (`https://api.resend.com/emails`).
- **Implementation:** [email.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/email.ts)
- **Use Case:** Transmits system-generated password reset request hyperlinks to verified user emails.
- **Authentication:** Leverages API Bearer Token authorization header using the `RESEND_API_KEY` configuration.

---

## Data Storage

### SQLite Database
- **Driver:** `better-sqlite3` (with synchronous write optimizations, journaling mode set to WAL, and foreign keys constraints enabled).
- **Storage Target:** Local file database defined via `DOCKLIGHT_DB_PATH` (defaults to `data/docklight.db`).
- **Database Schema & Tables:**
  - `users`: Tracks accounts (`id`, `username`, `email` [indexed/unique], `password_hash`, `role`, `createdAt`).
  - `command_history`: Logs commands run against the Dokku system (`id`, `command`, `exitCode`, `stdout`, `stderr`, `createdAt`).
  - `password_reset_tokens`: Stores temporal hashed verification codes (`id`, `user_id` [foreign key], `token_hash`, `expiresAt`, `usedAt`, `createdAt`).
  - `audit_log`: Tracks security/administrative events (`id`, `user_id` [foreign key], `action`, `resource`, `details`, `ip_address`, `createdAt`).

### Filesystem Storage
- **Application Server Settings:** Persisted directly inside `data/server-settings.json` on the host container's filesystem. Manages `dokkuSshTarget`, `dokkuSshKeyPath`, and `logLevel` configurations.

### Caching
- **Implementation:** Simple, transient memory cache dictionary wrapper ([cache.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/cache.ts)) used for buffering short-term, expensive Dokku CLI results. No external cache dependencies (e.g. Redis).

---

## Authentication & Identity

- **Auth Session Storage:** Custom JWT cookie authentication via `jsonwebtoken` and `cookie-parser`.
- **Session Credentials:** Cookies are configured with strict client protections (`httpOnly`, `secure`, `sameSite=strict`).
- **Password Protection:** Uses secure password hashing built on the native Node.js crypto module's `scrypt` algorithm.
- **Access Control Roles:** Implements role-based authorizations with three user roles:
  - `admin`: Full administrative access (user management, settings configurations, and raw command execution).
  - `operator`: Standard deployment access (reloading applications, scaling resources, configuring app settings).
  - `viewer`: Read-only access (monitoring app metrics, viewing deployment configurations, inspecting log files).

---

## Observability & Logging

- **Logging Library:** Pino structured logger (`pino` and `pino-http`).
- **Level Controls:** Configured globally via the `LOG_LEVEL` environment variable.
- **Audit Logs:** Log rotation schedules configured under [audit-rotation.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/audit-rotation.ts) to manage audit storage footprint.

---

## Configuration Variables

### Required Production Secrets
- `JWT_SECRET`: Essential encryption key for signing user sessions.

### Optional SSH & Target Configs
- `DOCKLIGHT_DOKKU_SSH_TARGET`: Host address target string for the SSH gateway connection (e.g. `dokku@172.17.0.1`).
- `DOCKLIGHT_DOKKU_SSH_KEY_PATH`: Host filesystem route to private SSH keys.
- `DOCKLIGHT_DOKKU_SSH_OPTS`: Additional arguments passed to SSH connections.
- `DOCKLIGHT_DB_PATH`: Host location for persistent SQLite database file storage.
- `PORT`: Server API socket listener (defaults to `3001`).
- `LOG_LEVEL`: System logging visibility threshold (defaults to `info`).

### Password Reset & Resend Configs
- `DOCKLIGHT_APP_URL`: Base application URL prepended to reset links (e.g., `https://docklight.example.com`).
- `RESEND_API_KEY`: API credential key authorizing requests to Resend.
- `RESEND_FROM_EMAIL`: Verified sender email header identifier.

### Rate Limiting Variables
- `DOCKLIGHT_RATE_LIMIT_WINDOW_MS`: Main API request window interval in milliseconds.
- `DOCKLIGHT_AUTH_MAX_REQUESTS`: Allowed rate count for authentication routes (e.g., login).
- `DOCKLIGHT_AUTH_CHECK_MAX_REQUESTS`: Allowed check-in rate counts.
- `DOCKLIGHT_COMMAND_WINDOW_MS`: Time duration window regulating Dokku action rate.
- `DOCKLIGHT_COMMAND_MAX_REQUESTS`: Rate limits for Dokku commands.
- `DOCKLIGHT_ADMIN_MAX_REQUESTS`: Administrative route invocation limit bounds.
