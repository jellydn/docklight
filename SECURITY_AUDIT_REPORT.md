# Security Audit Report: Command Injection & Input Validation

**Date:** 2026-03-01
**Auditor:** Security Agent
**Scope:** server/lib/ command execution and input validation
**Issue:** #46 - security: audit command injection vulnerabilities and input validation

---

## Executive Summary

This audit analyzed the Docklight server codebase for command injection vulnerabilities and input validation gaps. The codebase demonstrates **strong security practices** with multiple layers of protection:

1. **Command allowlist** (`allowlist.ts`) restricts executable commands
2. **Input validation** across all user-facing inputs
3. **Shell quoting** using `shellQuote()` for dangerous parameters
4. **App name validation** enforcing strict naming conventions

**Overall Risk Level:** LOW - No critical vulnerabilities found. Several recommendations for defense-in-depth.

---

## Security Architecture

### Command Allowlist (`server/lib/allowlist.ts`)

```typescript
export const ALLOWED_COMMANDS = ["dokku", "top", "free", "df", "grep", "awk", "curl"]
```

**Strengths:**
- Whitelist approach (deny-by-default)
- Checked before every command execution in `executeCommand()`
- Rejects unknown commands early

**Finding:** No vulnerabilities identified.

### Input Validation Layers

1. **App Name Validation** (`server/lib/apps.ts`):
   ```typescript
   export function isValidAppName(name: string): boolean {
       return /^[a-z0-9-]+$/.test(name);
   }
   ```
   - Enforces lowercase letters, numbers, hyphens only
   - Blocks shell metacharacters, spaces, uppercase letters

2. **Domain Validation** (`server/lib/domains.ts`):
   ```typescript
   if (/[;&$()|<>`'"\\]/.test(sanitizedDomain)) {
       return "Domain contains invalid characters";
   }
   if (!/^[a-zA-Z0-9.-]+$/.test(sanitizedDomain)) {
       return "Invalid domain format";
   }
   ```
   - Explicit shell metacharacter rejection
   - Domain format validation

3. **Config Key/Value Validation** (`server/lib/config.ts`):
   ```typescript
   const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");
   if (/[`$;|<>\\]/.test(value)) {
       return { error: "Value contains unsafe shell characters..." };
   }
   ```

4. **Database Name Validation** (`server/lib/databases.ts`):
   ```typescript
   const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");
   if (sanitizedName !== name) {
       return { error: "Database name contains invalid characters" };
   }
   ```

### Shell Quoting (`server/lib/shell.ts`)

```typescript
export function shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\"'\"'")}'`;
}
```

**Usage in Dokku Commands** (`server/lib/dokku.ts`):
- Applied to domains, config values, buildpacks, network settings
- Correctly handles single quotes within values

**Strengths:** Proper single-quote escaping with ANSI-C compliant fallback.

---

## Detailed Findings

### Finding 1: Docker Options - High Risk Input (SEVERITY: MEDIUM)

**Location:** `server/lib/docker-options.ts` lines 96-126

**Issue:** Docker options are passed to commands with `shellQuote()` but accept arbitrary user input:

```typescript
export async function addDockerOption(name, phase, option) {
    // No validation on 'option' content beyond type check
    if (!option || typeof option !== "string") {
        return createDockerOptionsError("Docker option is required");
    }
    const command = DokkuCommands.dockerOptionsAdd(name, phase, option);
    // Uses shellQuote() in command builder
}
```

**Command Builder:**
```typescript
dockerOptionsAdd: (app, phase, option) =>
    `dokku docker-options:add ${shellQuote(app)} ${shellQuote(phase)} ${shellQuote(option)}`
```

**Analysis:**
- `shellQuote()` properly escapes shell metacharacters
- Docker options can still accept potentially dangerous flags like `--privileged`, `--host-network`
- This is **by design** for flexibility (Docker options need to support arbitrary flags)

**Risk Assessment:**
- **Command Injection:** MITIGATED by shell quoting
- **Privilege Escalation:** POSSIBLE if users can set privileged containers
- **Recommendation:** Consider restricting dangerous Docker flags or admin-only access

---

### Finding 2: Plugin Repository URLs (SEVERITY: LOW)

**Location:** `server/lib/plugins.ts` lines 30-32

```typescript
function isSafeRepository(repository: string): boolean {
    return /^[a-zA-Z0-9@:/._-]+$/.test(repository);
}
```

**Issue:** Allows any URL-like string, including `file:///`, `ftp://`, etc.

**Analysis:**
- Plugin install command uses `shellQuote()` for repository parameter
- Command: `dokku plugin:install <repository>`
- Users could specify `file:///etc/passwd` (though Dokku would likely fail)

**Recommendation:**
- Restrict to HTTPS only: `^https://[a-zA-Z0-9.-]+/`
- Reject `file://`, `ftp://`, `http://` protocols

---

### Finding 3: Buildpack URLs (SEVERITY: LOW)

**Location:** `server/lib/buildpacks.ts` lines 74-99

```typescript
export async function addBuildpack(name, url, index) {
    if (!url || typeof url !== "string") {
        return createBuildpackError("Buildpack URL is required");
    }
    const command = DokkuCommands.buildpacksAdd(name, url, index);
    // shellQuote() applied in command builder
}
```

**Issue:** No URL validation beyond type check.

**Analysis:**
- Protected by `shellQuote()` in command builder
- Could accept `file:///etc/passwd` as buildpack URL
- Dokku buildpack system should validate, but defense-in-depth recommended

**Recommendation:** Add URL scheme validation (https://, git://, etc.)

---

### Finding 4: Deployment Branch Names (SEVERITY: LOW)

**Location:** `server/lib/deployment.ts` lines 103-127

```typescript
export async function setDeployBranch(name, branch) {
    if (!branch || typeof branch !== "string") {
        return createDeploymentError("Deploy branch is required");
    }
    const command = DokkuCommands.gitSetDeployBranch(name, branch);
    // shellQuote() applied in command builder
}
```

**Issue:** Branch names could contain command sequences if `shellQuote()` fails.

**Analysis:**
- Protected by `shellQuote()` in `gitSetDeployBranch()`
- Git branch names have restrictions anyway (no spaces, special chars)

**Status:** Acceptable risk.

---

### Finding 5: Network Property Values (SEVERITY: LOW)

**Location:** `server/lib/network.ts` lines 101-128

```typescript
export async function setNetworkProperty(name, key, value) {
    // Key validated against whitelist
    if (!isValidNetworkProperty(key)) {
        return createNetworkError("Invalid network property...");
    }
    const command = DokkuCommands.networkSet(name, key, value);
    // shellQuote() applied to all parameters
}
```

**Analysis:** Proper key validation, shell quoting on value.

---

## Positive Security Findings

1. **Consistent App Name Validation**: Every operation validates app names with `isValidAppName()` before command execution.

2. **Early Validation Pattern**: Input validation happens in library functions before commands are built, preventing malformed commands from reaching execution.

3. **No Direct Shell Execution**: All commands go through `executeCommand()` which:
   - Checks allowlist
   - Uses `child_process.exec()` with timeout (not raw shell)
   - Logs all commands for audit

4. **Test Coverage**: Security tests exist (`apps.test.ts` validates rejection of invalid names).

5. **Allowlist Enforcement**: The command allowlist is checked in `executeCommand()` before any execution.

---

## Malicious Input Test Cases

The following inputs were tested against the validation functions:

| Input Type | Malicious Input | Expected Result | Status |
|------------|-|-|:-:|
| App Name | `; rm -rf /` | Rejected (special chars) | PASS |
| App Name | `$(whoami)` | Rejected (parentheses, dollar) | PASS |
| App Name | `../../etc/passwd` | Rejected (dots, slashes) | PASS |
| App Name | `MyApp` | Rejected (uppercase) | PASS |
| Domain | `example.com; whoami` | Rejected (semicolon) | PASS |
| Domain | `example.com\`$(malicious)` | Rejected (backtick) | PASS |
| Config Key | `KEY; malicious` | Sanitized to `KEYmalicious` | PASS |
| Config Value | `value; whoami` | Rejected (semicolon) | PASS |
| DB Name | `db; rm -rf /` | Rejected (semicolon) | PASS |
| Process Type | `web; malicious` | Rejected (semicolon) | PASS |

---

## Recommendations

### Priority 1: URL Validation (Low Risk)
1. **Plugin Repositories**: Restrict to HTTPS URLs only
2. **Buildpack URLs**: Validate URL schemes (https://, git://)
3. **Implementation**: Add helper function in `lib/validators.ts`

```typescript
function isValidHttpsUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
```

### Priority 2: Docker Options Flag Restrictions (Medium Risk)
Consider restricting dangerous Docker flags like:
- `--privileged`
- `--host-network`
- `--user=root`

Or make docker-options modification admin-only.

### Priority 3: Add Security Tests
Create `server/lib/security.test.ts` with tests for:
- Shell metacharacter rejection
- Command injection attempts
- Path traversal attempts

### Priority 4: Input Length Limits
Add max length constraints to prevent DoS via long inputs:
- App names: 63 chars (DNS limit)
- Domains: 253 chars
- Config values: 4096 chars

---

## Security Assumptions Documented

1. **SSH Environment**: System assumes SSH keys are properly secured. Compromise of SSH key bypasses application security.

2. **Dokku Trust**: The application trusts Dokku CLI to handle its own input validation. Dokku is assumed to be secure.

3. **Authentication**: The auth system (password-based) is outside this audit's scope. Rate limiting is implemented.

4. **Network Security**: Application should run behind HTTPS. Local network access is assumed.

5. **Sudo Configuration**: When using root SSH targets, passwordless sudo is assumed for Dokku commands.

---

## Conclusion

The Docklight codebase demonstrates **good security practices** with multiple layers of input validation and command execution safeguards. The use of shell quoting, allowlist enforcement, and consistent validation patterns significantly reduces the risk of command injection.

**No critical vulnerabilities were identified.** The findings are primarily recommendations for defense-in-depth and hardening against edge cases.

The main areas for improvement are:
1. URL validation for plugin repositories and buildpacks
2. Consider restricting dangerous Docker options flags
3. Add explicit security-focused test cases

---

**Audit Completed:** 2026-03-01
**Next Review:** After any major changes to command execution or input handling
