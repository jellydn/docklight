# Codebase Concerns

**Analysis Date:** 2026-06-29

## Security Considerations

### ✅ Command Allowlist Bypass Vulnerability (P0) - [RESOLVED]
- **File:** [allowlist.ts](server/lib/allowlist.ts)
- **Status:** **Resolved** via structured `AppCommand` and automatic single-quote escaping.
- **Detail:** Replaced raw shell string checks in `executeCommand`/`executeCommandStreaming` with structured `AppCommand` normalization and automatic single-quote escaping via `shellQuote`, neutralizing shell metacharacter injection (`;`, `&&`, `||`, etc.).

### ⚠️ JWT Session Revocation / Validation Lag (P1)
- **File:** [auth.ts](server/lib/auth.ts#L118-L134)
- **Risk:** Deleted or demoted users retain API access until token expiry (up to 24h).
- **Detail:** The auth middleware validates sessions statelessly via `jwt.verify(token, JWT_SECRET)` without querying the database for user existence, role changes, or password resets.
- **Recommendation:** Store a `tokenVersion` or `passwordChangeTimestamp` in the JWT and verify against the database in `authMiddleware`, or implement a lightweight cache check.

### ⚠️ Lack of Password Strength Policy (P2)
- **Files:**
  - [ResetPassword.tsx](client/src/pages/ResetPassword.tsx#L19-L48)
  - [users.ts](server/routes/users.ts#L30-L71)
  - [auth.ts](server/routes/auth.ts#L78-L99)
- **Risk:** Brute-force and credential stuffing vulnerability.
- **Detail:** Registration, password update, and password reset flows only reject empty or non-string values — no length or complexity rules are enforced.
- **Recommendation:** Enforce minimum 8 characters with mixed case/digits/special characters on both client-side forms and server-side routes.

---

## Tech Debt & Code Quality

### 🧱 Ad-Hoc SQLite Schema Migrations
- **File:** [db.ts](server/lib/db.ts#L71-L77)
- **Detail:** Schema updates (e.g., adding the `email` column to `users`) are executed imperatively at startup via column introspection (`PRAGMA table_info`).
- **Impact:** As more tables/columns are added, this pattern becomes fragile and hard to roll back.
- **Recommendation:** Integrate a structured migration framework or implement a file-based migration runner with a `schema_migrations` tracking table.

### 🧱 Silent Email Service Failures in Production
- **Files:**
  - [auth.ts](server/routes/auth.ts#L63-L75)
  - [email.ts](server/lib/email.ts#L17-L30)
- **Impact:** Users are told a password reset email was sent, but it never arrives — with no visible alert that email is unconfigured.
- **Detail:** When `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is missing in production, the forgot-password endpoint returns success (to prevent username enumeration) and logs a server-side warning. The admin has no UI indication that email is unconfigured.
- **Recommendation:** Add a startup-level check for email credentials, or expose the email configuration status on the admin Settings page.

### 🧱 Biome Schema Version Mismatch
- **File:** `client/biome.json`
- **Detail:** The schema URL references version `2.4.4` but the installed Biome CLI is `2.4.5`, causing configuration warnings.
- **Recommendation:** Update the schema URL to `2.4.5` or run `biome migrate` in the client directory.

---

## Performance Bottlenecks

### ⚡ Synchronous CLI Command Execution
- **File:** [executor.ts](server/lib/executor.ts#L428-L503)
- **Detail:** Each non-streaming Dokku call runs via `execAsync` or `node-ssh execCommand`, blocking the event loop until completion.
- **Impact:** SSH connection pooling is in place, but concurrency is limited — multiple sequential requests (e.g., Dashboard for many active users) incur latency overhead.
- **Recommendation:** Cache expensive read-only reports, or queue command execution where possible.

### ⚡ SQLite Single-Node Limitation
- **File:** [db.ts](server/lib/db.ts#L24-L42)
- **Detail:** All application metadata (users, password reset tokens, command histories, audit logs) is stored in a single SQLite file, restricting Docklight to single-node deployments.
- **Recommendation:** Acceptable for a lightweight self-hosted utility, but document as a scaling constraint if multi-node HA Dokku management is desired.

---

## Fragile Areas

### 🧩 CLI Output Parsing
- **Files:**
  - [apps.ts](server/lib/apps.ts)
  - [databases.ts](server/lib/databases.ts)
  - [ssl.ts](server/lib/ssl.ts)
- **Risk:** High fragility depending on Dokku's version-specific stdout format.
- **Detail:** Status, virtual host configs, processes, and database links are parsed from console output using regex. Slight variations in stdout formats between Dokku versions could cause parsing errors.
- **Recommendation:** Build mock command fixtures from various Dokku versions for parsing tests, and implement fallback strategies for unknown output formats.

### 🧩 Admin Self-Deletion
- **File:** [users.ts](server/routes/users.ts#L160-L176)
- **Risk:** An admin can accidentally delete their own account, locking themselves out on token expiry.
- **Detail:** The backend prevents deleting the *last* admin, but does not prevent an admin from deleting their own account when other admins exist.
- **Recommendation:** Return `400 Bad Request` with "Cannot delete your own user account" when a user attempts to delete themselves.

### 🧩 Lack of Client-Side WebSocket Heartbeat
- **File:** [use-app-events.ts](client/src/hooks/use-app-events.ts#L55-L66)
- **Risk:** Client may sit in a stale connection state during silent network drops (firewall state expiry, Wi-Fi drop) without the socket closing.
- **Detail:** The client reconnects on socket close and the server implements ping-pong, but there is no client-side activity check for silent connection drops.
- **Recommendation:** Implement a client-side ping or activity check, forcing teardown and reconnect if no packets are received within a reasonable threshold (e.g., 60-90 seconds).

---

_Concerns audit updated: 2026-06-29_
