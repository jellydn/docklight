# Plan 003: Make Installer SSH Target Idempotent and Container-Reachable

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat a97eead..HEAD -- scripts/install.sh README.md docs/deployment.md server/.env.example`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-centralize-ssh-target-resolution.md`, `plans/002-share-ssh-target-parser.md`
- **Category**: bug
- **Planned at**: commit `a97eead`, 2026-06-15

## Why this matters

Open issue https://github.com/jellydn/docklight/issues/129 reports that re-running `scripts/install.sh` can overwrite a working `DOCKLIGHT_DOKKU_SSH_TARGET` with a public IP that the Docklight container cannot reach. Once that happens, every Dokku command from the UI can hang until the command timeout. The installer should prefer a container-reachable bridge target, preserve a known-good existing target, and allow an explicit operator override.

## Current state

- `scripts/install.sh` detects `SERVER_IP` using `api.ipify.org` first, then route/source-address fallback.
- The same `SERVER_IP` is used for public domains and the internal Docklight-to-Dokku SSH bridge.
- The installer unconditionally overwrites `DOCKLIGHT_DOKKU_SSH_TARGET` on every run.
- Docs and examples teach `dokku@<server-ip>` for the container-to-host bridge.

Public IP detection:

```bash
# scripts/install.sh:61
detect_ip() {
  local ip
  # 1. External lookup (most reliable for the publicly-routable address)
  ip="$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || true)"
```

Unconditional SSH bridge config:

```bash
# scripts/install.sh:239
log "Setting Dokku SSH bridge config"
dokku config:set --no-restart "${APP_NAME}" \
  DOCKLIGHT_DOKKU_SSH_TARGET="dokku@${SERVER_IP}" \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519 \
  DOCKLIGHT_DB_PATH=/app/data/docklight.db
```

Executor uses this target for all Dokku commands:

```ts
// server/lib/executor.ts:572
const sshTarget = getSshTarget();
if (sshTarget && command.startsWith("dokku ")) {
	return executeViaPool(command, sshTarget, timeout, options);
}
```

Docs currently show public IP as the bridge target:

```bash
# docs/deployment.md:112
dokku config:set docklight \
  DOCKLIGHT_DOKKU_SSH_TARGET=dokku@<your-server-ip> \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519
```

Repo conventions to match:

- Shell scripts use Bash with `set -euo pipefail`, small helper functions, and `log` / `warn` / `err`.
- Do not print secret values. SSH public targets are not secrets, but private keys and JWT secrets must not be printed.
- Keep installer reruns idempotent.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Shell syntax | `bash -n scripts/install.sh` | exit 0 |
| Typecheck | `just server-typecheck` | exit 0, no TypeScript errors |
| Lint | `just server-lint` | exit 0, no Biome errors |
| Tests | `just server-test` | exit 0, all server tests pass |

## Scope

**In scope**:

- `scripts/install.sh`
- `README.md`
- `docs/deployment.md`
- `server/.env.example`
- Optional: `scripts/install.test.sh` only if the repo already has shell-test conventions by the time this is executed.

**Out of scope**:

- Changing `server/lib/executor.ts` beyond what Plans 001 and 002 already cover.
- Adding new runtime APIs.
- Changing Dokku app creation, domain, HTTPS, or admin-user behavior.
- Publishing or closing GitHub issue #129.

## Git workflow

- Branch: `advisor/003-installer-ssh-target-idempotent`
- Commit message style: conventional commits, for example `fix(installer): preserve working dokku ssh target`
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Separate public IP from bridge target selection

Keep `detect_ip()` for public-facing domain/global-domain defaults. Add a new helper for the SSH bridge target, for example `detect_container_reachable_host()`.

Recommended detection order:

1. If an explicit override env var is set, use it. Name it `DOKKU_SSH_TARGET` or `DOCKLIGHT_DOKKU_SSH_TARGET`; document whichever you choose. If the value already includes `user@`, use it as-is; otherwise prefix `dokku@`.
2. Prefer the Docker bridge gateway when Docker is available. A practical host-side command is `ip -4 addr show docker0` or `docker network inspect bridge`; choose the simplest robust implementation for Ubuntu/Debian Dokku hosts.
3. Fall back to the existing route/source-address detection.
4. Fall back to `SERVER_IP` only as a last resort, with a warning that it may be unreachable from the container on some VPS networks.

Do not use `api.ipify.org` as the first choice for the internal bridge target.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 2: Preserve an existing configured target unless explicitly overridden or proven bad

Before setting `DOCKLIGHT_DOKKU_SSH_TARGET`, read the current app config:

```bash
CURRENT_SSH_TARGET="$(get_config DOCKLIGHT_DOKKU_SSH_TARGET)"
```

Target behavior:

- If `DOKKU_SSH_TARGET` or `DOCKLIGHT_DOKKU_SSH_TARGET` override is provided, set the target to that value.
- If no override is provided and `CURRENT_SSH_TARGET` is non-empty, keep it by default and log that it is being preserved.
- If no override is provided and no current target exists, set the detected container-reachable target.

Optional but valuable: after deploy, probe from the running Docklight container and warn if the preserved target is unreachable. Do not clobber a non-empty existing target based only on local host detection.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 3: Keep key path and database path idempotent

Continue setting:

- `DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519`
- `DOCKLIGHT_DB_PATH=/app/data/docklight.db`

It is acceptable to keep setting these on rerun because they are stable installer-managed values. The important change is that `DOCKLIGHT_DOKKU_SSH_TARGET` is not silently replaced by a newly detected worse IP.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 4: Update docs and examples

Update docs so manual operators understand that the container-to-host target is not always the VPS public IP.

Minimum docs updates:

- `README.md` environment variable table: describe `DOCKLIGHT_DOKKU_SSH_TARGET` as the container-reachable Dokku SSH target.
- `docs/deployment.md` Step 2.5: explain using a Docker bridge gateway or explicit known-good target, not blindly the public server IP.
- `docs/deployment.md` troubleshooting: add a short entry for 60s SSH command timeouts that points at an unreachable bridge target and references issue #129 symptoms.
- `server/.env.example`: replace `dokku@your-server-ip` with wording that makes the container-reachable requirement obvious.

**Verify**: `git diff -- README.md docs/deployment.md server/.env.example scripts/install.sh` -> docs and installer changes are limited to this SSH target topic.

### Step 5: Run final verification

Run all relevant checks:

```bash
bash -n scripts/install.sh
just server-typecheck
just server-lint
just server-test
```

Expected result: every command exits 0.

## Test plan

- There may be no existing shell-test harness. If none exists, do not invent a large one in this plan.
- At minimum, run `bash -n scripts/install.sh`.
- If adding small shell helper tests is straightforward, cover target normalization and "preserve current target when no override exists".
- Server tests should still pass because runtime behavior depends on Plans 001 and 002.

## Done criteria

- [ ] Re-running `scripts/install.sh` no longer unconditionally overwrites a non-empty `DOCKLIGHT_DOKKU_SSH_TARGET`.
- [ ] Installer supports an explicit operator override for the bridge target.
- [ ] First install prefers a container-reachable host address for the bridge target.
- [ ] README, deployment docs, and env example no longer imply the public VPS IP is always the right bridge target.
- [ ] `bash -n scripts/install.sh` exits 0.
- [ ] `just server-typecheck` exits 0.
- [ ] `just server-lint` exits 0.
- [ ] `just server-test` exits 0.
- [ ] Only in-scope files are modified, plus `plans/README.md` status update.

## STOP conditions

Stop and report back if:

- The installer has been replaced by another provisioning mechanism.
- Detecting a Docker bridge gateway would require installing packages or changing Docker/Dokku configuration.
- The fix appears to require changing app domain/global-domain behavior.
- A verification command fails twice after a reasonable fix attempt.
- You discover that Dokku on supported installs does not expose a stable container-reachable host gateway.

## Maintenance notes

The bridge target is internal connectivity, while `DOMAIN` and `GLOBAL_DOMAIN` are public routing concerns. Keep those concepts separate in future installer work. Reviewers should scrutinize rerun behavior especially closely: the script must be safe on both fresh installs and existing working installs.
