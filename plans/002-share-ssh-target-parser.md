# Plan 002: Share SSH Target Parsing Between Settings and Executor

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat a97eead..HEAD -- server/lib/executor.ts server/routes/settings.ts server/lib/executor.test.ts server/routes/settings.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-centralize-ssh-target-resolution.md`
- **Category**: bug
- **Planned at**: commit `a97eead`, 2026-06-15

## Why this matters

The Settings route has a "test connection" endpoint that parses SSH targets before trying a connection. The executor has its own parser for the actual runtime connection. These parsers accept and normalize targets differently, so Settings can disagree with production command execution on malformed ports or IPv6 forms.

## Current state

- `server/lib/executor.ts` has a private parser used by `SSHPool`.
- `server/routes/settings.ts` has a separate private parser used only by `/api/settings/test-connection`.
- `server/lib/executor.test.ts` already contains detailed parser behavior through `SSHPool.getConnection()`.
- `server/routes/settings.test.ts` currently tests GET/PUT settings but does not cover the connection parser.

Executor parser rejects invalid ports:

```ts
// server/lib/executor.ts:75
function parseTarget(target: string): ParsedSshTarget | null {
	const input = target.trim();
```

```ts
// server/lib/executor.ts:108
if (afterBracket.startsWith(":")) {
	const parsedPort = Number(afterBracket.slice(1));
	if (isValidPort(parsedPort)) {
		return { host, username, port: parsedPort };
	}
}
return null;
```

Settings parser silently falls back to port 22 for invalid ports:

```ts
// server/routes/settings.ts:51
if (host.includes(":")) {
	const colonIndex = host.lastIndexOf(":");
	const portStr = host.slice(colonIndex + 1);
	port = parseInt(portStr, 10);
	host = host.slice(0, colonIndex);
}

return { host, username, port: Number.isNaN(port) ? DEFAULT_SSH_PORT : port };
```

Repo conventions to match:

- Shared server helpers live under `server/lib/`.
- Relative TypeScript imports use `.js` extensions.
- Tests use Vitest and should avoid real network connections.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `just server-typecheck` | exit 0, no TypeScript errors |
| Lint | `just server-lint` | exit 0, no Biome errors |
| Tests | `just server-test` | exit 0, all server tests pass |
| Focused tests | `cd server && bun run test -- lib/executor.test.ts routes/settings.test.ts` | exit 0, focused tests pass |

## Scope

**In scope**:

- `server/lib/executor.ts`
- `server/routes/settings.ts`
- `server/lib/executor.test.ts`
- `server/routes/settings.test.ts`
- Optional: `server/lib/ssh-target.ts` and `server/lib/ssh-target.test.ts` if extracting the parser keeps the code clearer.

**Out of scope**:

- Changing SSH connection behavior beyond parser consistency.
- Changing `node-ssh` options or timeouts.
- Installer changes; those are Plan 003.
- Client Settings UI changes.

## Git workflow

- Branch: `advisor/002-share-ssh-target-parser`
- Commit message style: conventional commits, for example `refactor(server): share ssh target parser`
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Extract or export one SSH target parser

Prefer creating `server/lib/ssh-target.ts` with:

```ts
export interface ParsedSshTarget {
	host: string;
	username: string;
	port: number;
}

export function parseSshTarget(target: string): ParsedSshTarget | null {
	// Move executor parser behavior here.
}
```

Move the current executor parser behavior into this helper. Preserve the executor behavior that rejects invalid explicit ports rather than silently replacing them with port 22.

**Verify**: `just server-typecheck` -> exit 0.

### Step 2: Use the shared parser in executor and settings

In `server/lib/executor.ts`, remove the private parser and import `parseSshTarget` from the shared helper.

In `server/routes/settings.ts`, remove the route-local parser and import the same helper.

Do not change response shapes. The Settings route should still return `{ error: "Invalid SSH target format" }` for invalid targets.

**Verify**: `cd server && bun run test -- lib/executor.test.ts routes/settings.test.ts` -> exit 0.

### Step 3: Add parser regression tests

Add tests covering at least:

- `dokku@host` -> host `host`, username `dokku`, port 22.
- `dokku@host:2222` -> port 2222.
- `dokku@[2001:db8::1]:2222` -> IPv6 host without brackets and port 2222.
- `ssh://dokku@myhost:2222` -> URL format.
- `dokku@host:abc` -> invalid.
- `dokku@host:0` -> invalid.
- `dokku@host:65536` -> invalid.
- `ssh://myhost:2222` -> invalid because username is missing.

If you create `server/lib/ssh-target.test.ts`, keep the existing executor tests that assert `SSHPool` passes parsed values to `NodeSSH.connect`.

**Verify**: `cd server && bun run test -- lib/ssh-target.test.ts lib/executor.test.ts routes/settings.test.ts` -> exit 0. If no `ssh-target.test.ts` exists because you kept parser tests in executor tests, run the two existing test files instead.

## Test plan

- Parser unit tests for valid and invalid formats.
- Executor tests proving parsed host, username, and port still flow into `NodeSSH.connect`.
- Settings route tests proving invalid explicit ports return 400 rather than being treated as port 22.

## Done criteria

- [ ] There is only one implementation of SSH target parsing in server code.
- [ ] Settings connection testing and executor runtime use the same parser.
- [ ] Invalid explicit ports are rejected consistently.
- [ ] `just server-typecheck` exits 0.
- [ ] `just server-lint` exits 0.
- [ ] `just server-test` exits 0.
- [ ] Only in-scope files are modified, plus `plans/README.md` status update.

## STOP conditions

Stop and report back if:

- The parser is now provided by a different module or dependency.
- A test needs a real SSH server or real Dokku process.
- Settings route response shape would need to change.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Future support for SSH config aliases, jump hosts, or Unix sockets should be added to the shared parser and covered by parser tests first. Reviewers should check for duplicate parsing logic before approving future Settings or executor changes.
