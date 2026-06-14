# Plan 004: Clean Up SSH Bridge Documentation Consistency

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5939d05..HEAD -- README.md docs/deployment.md server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/003-make-installer-ssh-target-idempotent.md`
- **Category**: docs
- **Planned at**: commit `5939d05`, 2026-06-15

## Why this matters

The installer and primary deployment docs now distinguish public SSH access from the internal Docklight container-to-host SSH bridge. A few docs still use public-server-IP wording around `DOCKLIGHT_DOKKU_SSH_TARGET`, which can lead operators to recreate the issue fixed by Plan 003: a bridge target that works from a laptop but times out from inside Docker. This is a docs-only cleanup plan to remove stale examples and make the distinction hard to miss.

## Current state

- `README.md` already describes `DOCKLIGHT_DOKKU_SSH_TARGET` as a container-reachable target.
- `docs/deployment.md` Step 2.5 already uses `BRIDGE_HOST`.
- `server/.env.example` already uses `dokku@172.17.0.1`.
- One staging setup example still configures the bridge target as the public server IP.
- Agent/project docs still contain generic "remote Dokku" phrasing that can be clarified if those files are intended to stay current.

Updated README example:

```md
// README.md:193
| `DOCKLIGHT_DOKKU_SSH_TARGET` | No (recommended in production) | Container-reachable Dokku SSH target (e.g. `dokku@172.17.0.1`); the public IP may not work from inside Docker |
```

Updated manual setup example:

```bash
# docs/deployment.md:115
# Determine the container-reachable host IP.
# The Docker bridge gateway is usually 172.17.0.1 — verify with:
#   docker network inspect bridge | grep Gateway
# Or use: ip -4 addr show docker0
BRIDGE_HOST="172.17.0.1"
```

Stale staging example:

```bash
# docs/deployment.md:815
ssh dokku@<your-server-ip> config:set docklight-staging \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH='/app/.ssh/id_ed25519' \
  DOCKLIGHT_DOKKU_SSH_TARGET='dokku@<your-server-ip>' \
  JWT_SECRET='staging-secret'
```

Potentially stale project guidance:

```md
// AGENTS.md:208
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target (e.g., "dokku@server-ip")
```

```md
// .planning/codebase/INTEGRATIONS.md:89
- `DOCKLIGHT_DOKKU_SSH_TARGET` - SSH target for remote Dokku
```

Repo conventions to match:

- Keep docs concise and command-oriented.
- Use public server IP examples for laptop-to-Dokku SSH or Git remotes.
- Use `BRIDGE_HOST` / Docker bridge gateway examples only for Docklight container-to-host execution.
- Do not alter source code for this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Search stale bridge examples | `git grep -n "DOCKLIGHT_DOKKU_SSH_TARGET\\|dokku@<your-server-ip>\\|dokku@<server-ip>\\|dokku@server-ip" -- README.md docs server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md` | Remaining public-IP examples are only laptop SSH/Git remote examples, not bridge target examples |
| Docs diff review | `git diff -- README.md docs/deployment.md server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md` | Diff is docs-only and limited to SSH target wording |
| Typecheck | `just server-typecheck` | exit 0, no TypeScript errors |
| Lint | `just server-lint` | exit 0, no Biome errors |

## Scope

**In scope**:

- `README.md`
- `docs/deployment.md`
- `server/.env.example`
- `AGENTS.md`
- `.planning/codebase/INTEGRATIONS.md`

**Out of scope**:

- Any `.ts`, `.tsx`, `.js`, `.sh`, or config-file behavior changes.
- Changing Git remote examples such as `git remote add dokku dokku@<your-server-ip>:docklight`; those are laptop-to-server examples and are still correct.
- Changing ordinary SSH troubleshooting examples for `ssh dokku@<server-ip>`; those are also laptop-to-server examples.
- Reopening, closing, or commenting on GitHub issues.

## Git workflow

- Branch: `advisor/004-ssh-docs-consistency`
- Commit message style: conventional commits, for example `docs: clarify docklight ssh bridge target`
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Fix the staging `DOCKLIGHT_DOKKU_SSH_TARGET` example

In `docs/deployment.md` under "Staging Environment (PR Preview)", replace the public-IP bridge target with a container-reachable example. Use the same terminology as Step 2.5.

Suggested shape:

```bash
# Pick the container-reachable host IP for Docklight's internal SSH bridge.
# The Docker bridge gateway is usually 172.17.0.1.
BRIDGE_HOST="172.17.0.1"

ssh dokku@<your-server-ip> config:set docklight-staging \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH='/app/.ssh/id_ed25519' \
  DOCKLIGHT_DOKKU_SSH_TARGET="dokku@${BRIDGE_HOST}" \
  JWT_SECRET='staging-secret'
```

Keep `ssh dokku@<your-server-ip>` for the command that reaches the Dokku host from the operator's machine; only the `DOCKLIGHT_DOKKU_SSH_TARGET` value should change.

**Verify**: `git grep -n "DOCKLIGHT_DOKKU_SSH_TARGET=.*<your-server-ip>\\|DOCKLIGHT_DOKKU_SSH_TARGET=.*<server-ip>\\|DOCKLIGHT_DOKKU_SSH_TARGET=.*server-ip" -- README.md docs server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md` -> no matches.

### Step 2: Clarify project guidance references

Update generic `DOCKLIGHT_DOKKU_SSH_TARGET` descriptions in `AGENTS.md` and `.planning/codebase/INTEGRATIONS.md` if they still imply a public remote host. They should say "container-reachable Dokku SSH target" or equivalent.

Do not turn project docs into long deployment guides; keep them one-line clarifications.

**Verify**: `git grep -n "DOCKLIGHT_DOKKU_SSH_TARGET" -- README.md docs server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md` -> every description either says container-reachable or is in backup metadata where no description is needed.

### Step 3: Preserve correct public-IP examples

Review the grep output for `dokku@<your-server-ip>` and `dokku@<server-ip>`. Keep examples that describe:

- SSH from the operator's laptop to Dokku.
- Git remotes from the operator's laptop.
- Root/Dokku troubleshooting commands.

Only change examples where the value is assigned to `DOCKLIGHT_DOKKU_SSH_TARGET`.

**Verify**: `git diff -- README.md docs/deployment.md server/.env.example AGENTS.md .planning/codebase/INTEGRATIONS.md` -> all changes are docs-only and scoped to SSH bridge wording.

### Step 4: Run final checks

Run:

```bash
just server-typecheck
just server-lint
```

Expected result: both commands exit 0. No tests are required for a docs-only change unless source files were touched by mistake.

## Test plan

- Search-based regression check that no `DOCKLIGHT_DOKKU_SSH_TARGET` example points at `<your-server-ip>`, `<server-ip>`, or `server-ip`.
- Manual diff review to ensure public-IP examples remain where they describe laptop-to-server SSH/Git flows.
- `just server-typecheck` and `just server-lint` as repository sanity checks.

## Done criteria

- [ ] No docs example sets `DOCKLIGHT_DOKKU_SSH_TARGET` to a public-server-IP placeholder.
- [ ] The staging deployment section uses a container-reachable bridge target example.
- [ ] `AGENTS.md` and `.planning/codebase/INTEGRATIONS.md` no longer describe the bridge target as a generic remote server IP.
- [ ] Correct laptop-to-server `ssh dokku@<server-ip>` and Git remote examples are preserved.
- [ ] `just server-typecheck` exits 0.
- [ ] `just server-lint` exits 0.
- [ ] Only in-scope docs files are modified, plus `plans/README.md` status update.

## STOP conditions

Stop and report back if:

- You find source code still hard-codes public-IP bridge target behavior; that is outside this docs plan.
- A docs section intentionally targets a non-Docker deployment where `DOCKLIGHT_DOKKU_SSH_TARGET=dokku@<server-ip>` is required.
- The required changes would modify generated or archived docs rather than maintained docs.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Future docs should explicitly distinguish "operator SSH target" from "Docklight container SSH bridge target". The same string shape (`dokku@host`) is used for both, so reviewers should check the context before accepting public-IP examples.
