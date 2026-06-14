# Plan 001: Centralize SSH Target Resolution

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat a97eead..HEAD -- server/lib/executor.ts server/lib/server-config.ts server/lib/executor.test.ts server/lib/server-config.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a97eead`, 2026-06-15

## Why this matters

Docklight has two ways to configure the Dokku SSH bridge: environment variables and the Settings UI. Today the executor reads only `process.env.DOCKLIGHT_DOKKU_SSH_TARGET`, while `getSettings()` prefers the persisted settings file. That means an admin can save a working SSH target in Settings, see it reflected by the API, and still lose it after a process restart because the executor falls back to the stale env value.

## Current state

- `server/lib/executor.ts` executes Dokku commands and owns the runtime SSH pool.
- `server/lib/server-config.ts` reads and writes persisted server settings.
- `server/lib/executor.test.ts` already covers SSH pool behavior and env-based target lookup.
- Create `server/lib/server-config.test.ts` if it does not exist.

Current executor source of truth:

```ts
// server/lib/executor.ts:55
function getSshTarget(): string | undefined {
	return process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
}
```

Current persisted settings precedence:

```ts
// server/lib/server-config.ts:52
export function getSettings(): ServerSettings {
	const fileSettings = readSettingsFile();
	return {
		dokkuSshTarget:
			fileSettings.dokkuSshTarget ??
			process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim() ??
			DEFAULTS.dokkuSshTarget,
```

Current Settings update only changes process env for this process:

```ts
// server/lib/server-config.ts:101
writeSettingsFile(merged);

if (updates.dokkuSshTarget !== undefined) {
	process.env.DOCKLIGHT_DOKKU_SSH_TARGET = updates.dokkuSshTarget;
}
```

Repo conventions to match:

- TypeScript uses relative imports with `.js` extensions.
- Tests use Vitest (`describe`, `it`, `expect`, `vi`) and mock dependencies at module boundaries.
- Avoid comments unless needed; prefer small, named helpers.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `just server-typecheck` | exit 0, no TypeScript errors |
| Lint | `just server-lint` | exit 0, no Biome errors |
| Tests | `just server-test` | exit 0, all server tests pass |
| Focused tests | `cd server && bun run test -- lib/executor.test.ts lib/server-config.test.ts` | exit 0, focused tests pass |

## Scope

**In scope**:

- `server/lib/executor.ts`
- `server/lib/server-config.ts`
- `server/lib/executor.test.ts`
- `server/lib/server-config.test.ts` (create if absent)

**Out of scope**:

- `scripts/install.sh`; that is Plan 003.
- `server/routes/settings.ts`; parser consolidation is Plan 002.
- Client UI changes.
- Changing the public shape of `/api/settings`.

## Git workflow

- Branch: `advisor/001-centralize-ssh-target-resolution`
- Commit message style: conventional commits, for example `fix(server): use persisted ssh settings for executor`
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a helper that exposes effective SSH settings

In `server/lib/server-config.ts`, add an exported helper such as:

```ts
export function getEffectiveDokkuSshConfig(): {
	target: string | undefined;
	keyPath: string | undefined;
} {
	const settings = getSettings();
	return {
		target: settings.dokkuSshTarget.trim() || undefined,
		keyPath: settings.dokkuSshKeyPath.trim() || undefined,
	};
}
```

Use the existing `getSettings()` precedence so persisted settings win over environment variables.

**Verify**: `just server-typecheck` -> exit 0.

### Step 2: Make executor use the effective settings helper

In `server/lib/executor.ts`, import the helper with a `.js` extension. Replace direct reads of `process.env.DOCKLIGHT_DOKKU_SSH_TARGET` and `process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH` inside runtime Dokku execution paths with the helper.

Target behavior:

- `executeCommand()` should use the effective target for Dokku commands.
- `executeCommandStreaming()` should use the effective target for Dokku commands.
- `executeViaPool()` and `executeViaPoolStreaming()` should use the effective key path.
- `buildRuntimeCommand()` may remain env-based if keeping it strictly backward-compatible is simpler, but if you switch it to the helper, update its tests.

**Verify**: `cd server && bun run test -- lib/executor.test.ts` -> exit 0.

### Step 3: Add tests for persisted setting precedence

Add tests that prove:

- When a settings file contains `dokkuSshTarget`, `executeCommand("dokku apps:list")` connects to that target even if `process.env.DOCKLIGHT_DOKKU_SSH_TARGET` has a different value.
- When a settings file contains `dokkuSshKeyPath`, the SSH connection uses that private key path even if env has a different value.
- When the settings file is absent, env variables still work as before.

If direct filesystem testing is awkward, test `getEffectiveDokkuSshConfig()` in `server/lib/server-config.test.ts` and keep one executor integration test with mocks. Use a temporary `DOCKLIGHT_DB_PATH` under the test temp area so the settings file does not touch real project data.

**Verify**: `cd server && bun run test -- lib/executor.test.ts lib/server-config.test.ts` -> exit 0.

## Test plan

- Model executor tests after existing cases in `server/lib/executor.test.ts`.
- Add server-config tests for file-over-env precedence and env fallback.
- Run:
  - `cd server && bun run test -- lib/executor.test.ts lib/server-config.test.ts`
  - `just server-test`

## Done criteria

- [ ] Executor resolves Dokku SSH target and key path from the same effective settings source as `/api/settings`.
- [ ] Persisted settings override environment variables after restart.
- [ ] Environment variable fallback still works when no persisted settings exist.
- [ ] `just server-typecheck` exits 0.
- [ ] `just server-lint` exits 0.
- [ ] `just server-test` exits 0.
- [ ] Only in-scope files are modified, plus `plans/README.md` status update.

## STOP conditions

Stop and report back if:

- `server/lib/server-config.ts` no longer uses a JSON settings file under the database directory.
- Making the executor use persisted settings requires changing route handlers or client code.
- Tests need a real SSH server or real Dokku process.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

After this lands, any new SSH-related setting should go through the same effective settings helper. Reviewers should check that executor tests do not depend on real project-local `data/` files and that env mutation is restored between tests.
