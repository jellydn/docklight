# Codebase Concerns

**Analysis Date:** 2026-06-29

## Security Considerations

### ✅ Command Allowlist Bypass Vulnerability (P0) - [RESOLVED]
- **File:** [allowlist.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/allowlist.ts)
- **Status:** **Resolved** via structured `AppCommand` and automatic single-quote escaping.
- **Detail:** Replaced raw shell string checks in `executeCommand` and `executeCommandStreaming` with internal parser normalization using `splitShellWords`, transforming string inputs to the safe structured `AppCommand` shape. Added automatic argument single-quoting via `shellQuote`, fully neutralizing all shell metacharacter separators (like `;`, `&&`, `||`, etc.).


### ⚠️ JWT Session Revocation / Validation Lag (P1)
- **File:** [auth.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/auth.ts#L118-L134)
- **Risk:** Unauthorized access by deleted or demoted users.
- **Detail:** The authentication middleware (`authMiddleware`) validates incoming sessions state-lessly using `jwt.verify(token, JWT_SECRET)`. It does not query the database to verify if the user record still exists, if the user's role has changed, or if their password has been reset.
- **Impact:** When a user is deleted, demoted, or reset, their active JWT session token remains fully valid for up to 24 hours, granting them full API access under their previous permissions during that window.
- **Recommendation:** Implement a lightweight cache or fast database check in `authMiddleware` to confirm user existence, role matches, and token/password validity (e.g., storing a `tokenVersion` or `passwordChangeTimestamp` in the JWT and comparing it to the database/cache).

### ⚠️ Lack of Password Strength Policy (P2)
- **Files:**
  - [ResetPassword.tsx](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/pages/ResetPassword.tsx#L19-L48)
  - [users.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/users.ts#L30-L71)
  - [auth.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/auth.ts#L78-L99)
- **Risk:** Brute-force and credential stuffing vulnerability.
- **Detail:** The user registration, password updates, and password reset flows do not enforce any password length or complexity rules. It accepts arbitrary strings (excluding simple empty or non-string checks).
- **Recommendation:** Implement password strength rules (e.g., minimum 8 characters, requiring mixed case/digits/special characters) on both client-side forms and server-side routes.

---

## Tech Debt & Code Quality

### 🧱 Ad-Hoc SQLite Schema Migrations
- **File:** [db.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/db.ts#L71-L77)
- **Detail:** Database schema updates (such as adding the `email` column to the `users` table) are currently executed imperatively at runtime during database initialization via column introspection (`PRAGMA table_info`).
- **Impact:** As the application scales and more tables/columns are added, this introspection pattern becomes difficult to maintain, fragile, and harder to roll back.
- **Recommendation:** Integrate a structured migration library (e.g., using `better-sqlite3` compatible migration frameworks) or implement a simple file-based migration runner with a dedicated `schema_migrations` tracking table.

### 🧱 Silent Email Service Failures in Production
- **Files:**
  - [auth.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/auth.ts#L63-L75)
  - [email.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/email.ts#L17-L30)
- **Detail:** If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is not set in production, the `/api/auth/forgot-password` endpoint fails silently by design (to prevent username enumeration attacks) but logs only a server-side warning. The requesting user sees a success toast but never receives an email, and there is no visible alert in the UI that the system's email sender service is unconfigured.
- **Recommendation:** Add a startup-level check or self-test query for email credentials, or expose a warning status on the admin Settings page to alert administrators if email services are not configured.

### 🧱 Biome Schema Version Mismatch
- **File:** `client/biome.json`
- **Detail:** The configuration schema URL specifies version `2.4.4`, but the installed Biome CLI version is `2.4.5`, causing Biome configuration warnings.
- **Recommendation:** Update the schema URL to point to `2.4.5` or execute `biome migrate` in the client directory.

---

## Performance Bottlenecks

### ⚡ Synchronous CLI Command Execution
- **File:** [executor.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/executor.ts#L428-L503)
- **Detail:** Each non-streaming Dokku call is run via `execAsync` (or node-ssh `execCommand`), blocking node execution or SSH channel resources until completion.
- **Impact:** While SSH connection pooling (`SSHPool`) is implemented, concurrency is limited. Multiple sequential requests (e.g., rendering the Dashboard for many active users) will incur latency overhead.
- **Recommendation:** Introduce caching for expensive read-only reports, or queue command execution where possible.

### ⚡ SQLite Single-Node Limitation
- **File:** [db.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/db.ts#L24-L42)
- **Detail:** Storing all application metadata (users, password reset tokens, command histories, audit logs) in a single SQLite file restricts Docklight to single-node server setups.
- **Recommendation:** Acceptable for a lightweight self-hosted utility, but document as a scaling constraint if multi-node High Availability (HA) Dokku managers are ever desired.

---

## Fragile Areas

### 🧩 CLI Output Parsing
- **Files:**
  - [apps.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/apps.ts)
  - [databases.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/databases.ts)
  - [ssl.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/lib/ssl.ts)
- **Risk:** High fragility depending on Dokku's version-specific stdout format.
- **Detail:** The status, virtual host configurations, processes, and database links are parsed from console text output using regex patterns. Any slight variations in stdout headers or layouts between different Dokku minor versions could cause parsing errors.
- **Recommendation:** Build mock command fixtures from various Dokku versions to verify parsing integrity in tests, and implement fallback strategies for unknown outputs.

### 🧩 Admin Self-Deletion
- **File:** [users.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/server/routes/users.ts#L160-L176)
- **Detail:** While the backend checks that the *last* admin cannot be demoted or deleted, an admin user can still delete their own user account if other admin users exist.
- **Impact:** An administrator could accidentally delete themselves, resulting in their active session being invalidated on token expiration and blocking their access.
- **Recommendation:** Implement a specific backend check to disallow users from deleting their own accounts (returning `400 Bad Request` with message "Cannot delete your own user account"), prompting them to have another admin perform the deletion.

### 🧩 Lack of Client-Side WebSocket Heartbeat
- **File:** [use-app-events.ts](file:///Users/huynhdung/src/tries/2026-06-28-jellydn-docklight-pr-137/client/src/hooks/use-app-events.ts#L55-L66)
- **Detail:** The client listens to `/api/events/stream` and reconnects on socket close. The server implements ping-pong, but if a network segment silently drops without closing the socket (e.g. firewall state expiry, silent Wi-Fi drop), the client may sit in a stale state for a long time.
- **Recommendation:** Implement a periodic ping or activity check in the client hook, forcing a socket teardown and reconnect if no packets (or ping messages) are received within a reasonable threshold (e.g. 60-90 seconds).

---

_Concerns audit updated: 2026-06-29_
