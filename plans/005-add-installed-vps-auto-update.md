# Plan 005: Add Opt-In Auto-Update for Installed VPSes

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat ab80f83..HEAD -- scripts/install.sh README.md docs/deployment.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ab80f83`, 2026-06-15

## Why this matters

Docklight's one-line installer is convenient for first install, but installed VPSes currently require manual operator action to pick up new Docklight releases. The repo already deploys from a configured Git repository and branch with `dokku git:sync --build`, so the lowest-risk auto-update path is an opt-in host-level scheduled updater installed by `scripts/install.sh`. Keep this outside the web app initially: an in-app "update myself" flow would give the web process more control over its own deployment and needs a separate product/security design.

## Current state

- `scripts/install.sh` accepts `REPO_URL` and `BRANCH`.
- The installer deploys with `dokku git:sync --build`.
- `docs/deployment.md` only documents manual updates via local `git push`.
- There is no systemd timer, cron job, update script, or update setting today.

Installer env vars:

```bash
# scripts/install.sh:39
APP_NAME="${APP_NAME:-docklight}"
DOMAIN="${DOMAIN:-}"
REPO_URL="${REPO_URL:-https://github.com/jellydn/docklight.git}"
BRANCH="${BRANCH:-main}"
```

Installer deploy step:

```bash
# scripts/install.sh:308
# ---------- 7. deploy ----------
log "Deploying ${APP_NAME} from ${REPO_URL} (branch: ${BRANCH})"
dokku git:sync --build "${APP_NAME}" "${REPO_URL}" "${BRANCH}"
```

Manual update docs:

```md
// docs/deployment.md:255
## Updating

To deploy a new version:

```bash
# From your local machine
cd docklight
git pull origin main    # or make your changes
git push dokku main
```
```

Repo conventions to match:

- Bash scripts use `set -euo pipefail`, helper functions (`log`, `warn`, `err`), and idempotent rerun behavior.
- Installer features are configured by environment variables documented in the header, README, and deployment guide.
- Do not print secrets. Repository URLs can contain credentials for private repos, so sanitize them before logging.
- Root-level checks use `just`; shell syntax checks use `bash -n`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Shell syntax | `bash -n scripts/install.sh` | exit 0 |
| Search generated names | `git grep -n "AUTO_UPDATE\\|auto-update\\|systemd\\|docklight-update" -- scripts README.md docs` | Shows the intended installer/docs references only |
| Typecheck | `just server-typecheck` | exit 0, no TypeScript errors |
| Lint | `just server-lint` | exit 0, no Biome errors |

## Scope

**In scope**:

- `scripts/install.sh`
- `README.md`
- `docs/deployment.md`
- Optional: `scripts/update.sh` if extracting the generated updater script from the installer makes it easier to test and maintain.

**Out of scope**:

- Client UI for checking or applying updates.
- Server API endpoints for update management.
- Automatic rollback logic.
- Switching the project to image-based deployment, Watchtower, GitHub Actions, or Renovate-driven server updates.
- Updating Dokku itself; this plan only updates the Docklight app.

## Git workflow

- Branch: `advisor/005-installed-vps-auto-update`
- Commit message style: conventional commits, for example `feat(installer): add opt-in auto-update timer`
- Do not push or open a PR unless the operator instructs it.

## Recommended design

Add an opt-in installer feature that creates a host-side systemd service and timer:

- `ENABLE_AUTO_UPDATE=1` turns it on.
- `AUTO_UPDATE_SCHEDULE` controls `OnCalendar`, defaulting to `daily`.
- `AUTO_UPDATE_REPO_URL` defaults to `REPO_URL`.
- `AUTO_UPDATE_BRANCH` defaults to `BRANCH`.
- `AUTO_UPDATE_KEEP_BACKUPS` defaults to a small number such as `5`.

Generated files should be app-name-specific so multiple Docklight installs do not collide:

- `/usr/local/bin/${APP_NAME}-update`
- `/etc/systemd/system/${APP_NAME}-update.service`
- `/etc/systemd/system/${APP_NAME}-update.timer`

The update script should:

1. Use `flock` so updates cannot overlap.
2. Confirm `dokku apps:exists "${APP_NAME}"`.
3. Create a lightweight pre-update backup of `/var/lib/dokku/data/storage/${APP_NAME}/docklight.db` if the file exists.
4. Run `dokku git:sync --build "${APP_NAME}" "${AUTO_UPDATE_REPO_URL}" "${AUTO_UPDATE_BRANCH}"`.
5. Prune old backups down to `AUTO_UPDATE_KEEP_BACKUPS`.
6. Log to stdout/stderr so systemd journal captures results.

Do not put repository credentials in the generated unit files if avoidable. If a private repo must be supported, document that the Dokku host needs deploy credentials (SSH deploy key or credentialed URL) and warn that credentialed URLs stored in systemd units are sensitive.

## Steps

### Step 1: Add installer environment variables

In `scripts/install.sh`, add documented variables near the existing installer header:

```bash
#   ENABLE_AUTO_UPDATE      Install a systemd timer to update Docklight (1/0, default: 0)
#   AUTO_UPDATE_SCHEDULE   systemd OnCalendar value (default: daily)
#   AUTO_UPDATE_REPO_URL   Repo used by auto-update (default: REPO_URL)
#   AUTO_UPDATE_BRANCH     Branch used by auto-update (default: BRANCH)
#   AUTO_UPDATE_KEEP_BACKUPS Number of DB backups to keep (default: 5)
```

Initialize them near the other env defaults. Keep auto-update disabled by default.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 2: Add helper functions for sanitized logging and systemd setup

Add a helper that redacts credentials from URLs before logging. It should handle at least `https://user:token@host/path.git` by replacing credentials with `[REDACTED]`. Do not overbuild; this is for logs only.

Add an installer function such as `install_auto_update_timer()`. It should:

- Write the update script atomically.
- `chmod 0755` the script.
- Write the service and timer units.
- Run `systemctl daemon-reload`.
- Enable and start the timer with `systemctl enable --now "${APP_NAME}-update.timer"`.

If `systemctl` is missing, warn and skip auto-update setup rather than failing the whole install.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 3: Generate a safe updater script

The generated updater script should be explicit and boring. Target shape:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="docklight"
REPO_URL="https://github.com/jellydn/docklight.git"
BRANCH="main"
STORAGE_DIR="/var/lib/dokku/data/storage/${APP_NAME}"
BACKUP_DIR="${STORAGE_DIR}/update-backups"
LOCK_FILE="/var/lock/${APP_NAME}-update.lock"
KEEP_BACKUPS="5"

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Another ${APP_NAME} update is already running"; exit 0; }

dokku apps:exists "${APP_NAME}" >/dev/null
mkdir -p "${BACKUP_DIR}"
if [[ -f "${STORAGE_DIR}/docklight.db" ]]; then
  cp "${STORAGE_DIR}/docklight.db" "${BACKUP_DIR}/docklight-$(date -u +%Y%m%dT%H%M%SZ).db"
fi

dokku git:sync --build "${APP_NAME}" "${REPO_URL}" "${BRANCH}"

find "${BACKUP_DIR}" -name 'docklight-*.db' -type f | sort -r | tail -n +"$((KEEP_BACKUPS + 1))" | xargs -r rm -f
```

Adjust quoting and formatting to match the installer style. The executor may improve the backup pruning implementation if needed, but it must remain simple and readable.

**Verify**: `bash -n scripts/install.sh` -> exit 0. If you extract a separate `scripts/update.sh`, also run `bash -n scripts/update.sh`.

### Step 4: Wire the installer flow

After the main `dokku git:sync --build` deploy succeeds, call `install_auto_update_timer` only when `ENABLE_AUTO_UPDATE=1`.

Expected behavior:

- Fresh install with no auto-update env var does not create any systemd files.
- Fresh install with `ENABLE_AUTO_UPDATE=1` creates/enables the timer.
- Re-running install with `ENABLE_AUTO_UPDATE=1` updates the script and units idempotently.
- Re-running install without `ENABLE_AUTO_UPDATE=1` should not disable an existing timer unless you add and document an explicit `DISABLE_AUTO_UPDATE=1` flag. Prefer no implicit disable.

**Verify**: `bash -n scripts/install.sh` -> exit 0.

### Step 5: Document usage, risks, and operations

Update `README.md` installer env var list and `docs/deployment.md` Updating section.

Docs must cover:

- How to enable at install time:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
    | sudo ENABLE_AUTO_UPDATE=1 AUTO_UPDATE_SCHEDULE=daily bash
  ```
- How to enable on an already-installed VPS by rerunning the installer with `ENABLE_AUTO_UPDATE=1`.
- How to inspect status:
  ```bash
  systemctl status docklight-update.timer
  journalctl -u docklight-update.service -n 100 --no-pager
  ```
- How to run manually:
  ```bash
  sudo systemctl start docklight-update.service
  ```
- Security tradeoff: tracking a branch means trusting that branch for unattended deploys; keep SSH/root fallback and consider pinning to a controlled fork/branch if needed.
- Private repo caveat: the Dokku host needs credentials before unattended `git:sync` can work.

**Verify**: `git diff -- README.md docs/deployment.md scripts/install.sh` -> docs and installer changes are limited to auto-update.

### Step 6: Final verification

Run:

```bash
bash -n scripts/install.sh
just server-typecheck
just server-lint
```

Expected result: every command exits 0. Server tests are not required if only shell/docs changed, but run `just server-test` if any server TypeScript changes were made.

## Test plan

- Shell syntax check for installer and any extracted updater script.
- Search check that all new env vars are documented in installer header and README.
- Manual review of generated unit names and file paths for app-name scoping.
- No real Dokku/systemd integration test is required in this repo unless a safe shell-test harness already exists.

## Done criteria

- [ ] Auto-update is opt-in and disabled by default.
- [ ] Installer creates an app-specific systemd service and timer when enabled.
- [ ] Generated update script uses `flock` and cannot overlap itself.
- [ ] Generated update script backs up the SQLite DB file when present before deploying.
- [ ] Re-running the installer with auto-update enabled is idempotent.
- [ ] README and deployment docs explain enablement, status inspection, manual run, private repo caveat, and branch-tracking risk.
- [ ] `bash -n scripts/install.sh` exits 0.
- [ ] `just server-typecheck` exits 0.
- [ ] `just server-lint` exits 0.
- [ ] Only in-scope files are modified, plus `plans/README.md` status update.

## STOP conditions

Stop and report back if:

- Supporting auto-update requires a server API or client UI.
- The installer is no longer the supported path for installed VPS management.
- The update mechanism would need to store plaintext private keys or tokens in generated files.
- The implementation would update Dokku itself, Docker, or OS packages.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

This plan intentionally starts with host-level scheduled updates. A future UI can read timer status or trigger the service, but should not be part of this first implementation. Reviewers should focus on idempotency, credential redaction, and making sure an unattended branch-tracking deploy is clearly documented as an opt-in trust decision.
