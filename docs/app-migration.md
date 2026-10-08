# Move one Dokku app to a new VPS

## What

Move one app at a time. Leave other apps and global Dokku settings unchanged.
The current tool collects read-only inventory. It does not back up, restore,
freeze writes, change DNS, or execute a migration. The remaining steps below
are operator procedures, not automated features.

## Why

A per-app move limits downtime and rollback scope. Shared databases, volumes,
queues and internal app calls can prevent an independent move. DNS propagation
must not leave two independent copies accepting writes.

## How: collect inventory

After separate approval to inspect the source, run from `server/` on the source
host, with a trusted Dokku installation and the required read permissions:

```bash
bun run inventory:app --help
bun run inventory:app --local --app pilot --format report
umask 077
bun run inventory:app --local --app pilot --format json > pilot-inventory.json
```

The built CLI is also available as `node dist/app-migration-inventory.js` after
`bun run build`. `--local` is required. There is no SSH or remote fallback and
Docklight's global SSH settings are not used. Run this on the host, not inside
a Docklight container with no local Dokku installation. The tool does not verify
host identity; the operator must confirm the source before running it.

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | Inventory probes collected; **not** approval or readiness to migrate |
| 1 | Invalid arguments or app name |
| 2 | At least one failed or unrecognized observation; partial inventory emitted |

Manifest version `1.0` includes the selected app, a full Git commit when found,
app/global config key names, supported database service links and sharing, probe
statuses, and manual blockers. `readyForMigration` is always `false`.

Only fixed read-only Dokku reports, lists, links and config-key queries are used.
Each local command has a 30-second timeout and a 1 MiB output limit. There is no
retry, shell interpolation, pruning, config-value query, or database-info query.
Raw stdout/stderr, errors, config values, host addresses, domains and mount paths
are not written to the output or Docklight history. They can exist transiently in
process memory. Config keys and service/app names are operational metadata:
restrict access to the resulting report even though it excludes secret values.

An `observed` status means the command succeeded, not that all settings were
parsed or checked. Reports for processes, builders, buildpacks, domains, ports,
proxy, checks, networks, Docker options, storage and certificates are coverage
signals only. Review their exact values through a secure operator session.

Database discovery scans installed supported plugins and each service's links
to find sharing with other source apps. Plain name lists and Dokku banner lines
are accepted. Other formats become `unknown`; they are never treated as proof
that a dependency is absent. Custom plugins, external databases, aliases,
unlinked consumers, shared paths and cross-app calls require manual review.

## Select a low-risk pilot

Prefer a noncritical stateless app with low traffic, a custom domain, simple TLS,
a pinned reproducible deployment, and no shared services, jobs, or cross-app calls.
Require a named app owner, a short approved maintenance window, and testable user
workflows. Otherwise choose one small dedicated database with a proven restore.
Do not select Docklight itself as the first pilot: its controller access, SQLite
data and container-to-host SSH bridge add recovery dependencies.

## Preflight and dependency gate

Record the following in a restricted app migration checklist:

- Source/destination identity and SSH fingerprints; OS, CPU architecture, Dokku,
  Docker, plugin and database versions. Match versions first; upgrade separately.
- Exact source revision/image digest, deployment method, release hooks,
  builder/buildpacks, process counts, app/global config, domains, proxy/ports,
  networks, Docker options, checks and resource settings.
- Every database, link/alias, cache, queue, upload directory, bind mount, named
  volume, external path, shared path and persistent data inside containers.
- Cron jobs, workers, outside producers, app-to-app calls, reverse dependencies,
  CI deployment targets, firewall/IP allowlists, OAuth and webhook endpoints.
- Owner, freeze authority, downtime budget, recovery point, backup/key custody,
  acceptance thresholds, rollback procedure and source retention period.

Measure source disk bytes, available space, inodes, growth and destination
restore/build headroom directly on the hosts. Docklight dashboard metrics may
describe its local container rather than the remote Dokku VPS. Stream encrypted
backups off-host; do not stage a large archive on a nearly full source root.
Account for engine export temporary space. Stop if capacity is unknown or low.
Do not automatically run cleanup or remove images, volumes or database files.

Inspect a zombie's PID, PPID, age and parent service. A zombie has already exited;
killing it does not make its parent reap it. A stable single zombie is not an
automatic blocker. A failed parent or increasing count needs investigation.
Restarting the parent or rebooting requires impact review and separate approval.

### Block independent migration when

| Dependency | Required decision |
| --- | --- |
| Shared database | Keep one authoritative service with a tested private/TLS route, or migrate all writers as a coordinated unit. Do not fork live data. |
| Shared volume | Use tested shared storage or move all readers/writers together. A copied local directory does not stay synchronized. |
| Queue | Identify every producer/consumer, drain/fence as required and prove message preservation. Definitions alone do not prove queued messages were copied. |
| Internal app calls | Replace host-local Docker/Dokku names with a tested secure route and update all affected callers. |
| Shared jobs/TLS/host services | Confirm ownership; do not disable or replace source resources still needed by other apps. |
| Unknown or unsupported state | Supply and rehearse an explicit manual procedure, or stop. |

Retained source dependencies must be documented and monitored. In that case the
app moves, but those dependencies have not moved. Do not call the migration
complete without recording this distinction.

## Backup and isolated rehearsal

1. Back up config values and deployment source securely. Keep them out of Git,
   command history, PRs, logs and reports. Pin SSH host keys through a trusted
   channel; do not disable host-key verification.
2. Use engine-consistent exports or supported snapshots. Verify the installed
   plugin/version's backup semantics for Postgres, MySQL/MariaDB, Mongo, Redis
   and RabbitMQ. Distinguish durable Redis state from cache, and queue messages
   from definitions. Never assume a live datastore-directory copy is consistent.
3. Back up volumes with required numeric ownership, permissions, symlinks,
   ACLs/xattrs and checksums. Include mounts outside the default Dokku storage
   directory. Preserve an independent encrypted backup, not only a destination
   working copy. Check restore paths and reject archive traversal/unsafe links.
4. Create the isolated destination app. Restore dedicated data and mounts,
   recreate networks and database links/aliases, and deploy the exact revision.
   Replace generated connection URLs, old internal addresses and host paths.
   Preserve portable config. Do not change global settings used by other apps.
5. Keep workers, cron, outbound notifications, payments and webhooks disabled.
   Review release hooks before deployment so rehearsal cannot alter production.
6. Verify restored data integrity and representative reads/uploads/controlled
   writes. Time export, transfer, import and startup. If the measured final-sync
   time exceeds the freeze budget, revise the method before cutover.

For a stateless app, explicitly mark database and persistent-volume steps as
not applicable. A successful transfer alone is not a successful restore.

## Temporary hostname, production domain and TLS

Use an access-restricted temporary custom hostname on destination with valid TLS.
Check health, login, reads, uploads, redirects and controlled writes on rehearsal
data. Also use a DNS override to test the production hostname with correct Host
and SNI: temporary names do not prove cookie, OAuth, CORS or redirect behavior.

Set app domains/proxy settings without changing source DNS yet. Securely transfer
valid certificate/private-key material where supported, or use an approved
issuance method. Verify chain, hostname coverage, expiry and renewal. HTTP-01
typically needs public routing; plan certificate availability before cutover.
Old-IP `sslip.io` names do not follow a new VPS. Do not assume IPs transfer unless
the provider confirms it. Check CI remotes and external IP allowlists separately.

## Brief freeze, final sync and DNS cutover

1. Lower DNS TTL early enough for the previous TTL to expire. Save original A,
   AAAA, wildcard and alias records for every affected app hostname.
2. Obtain explicit freeze/cutover approval. Freeze deployments/config changes,
   web writes, workers, cron, outside producers and administrative writers.
   Drain outstanding work. For retained shared services, coordinate fencing
   with their owners; do not stop other apps implicitly.
3. Take the final consistent database export and final volume sync while writers
   remain stopped. Record the checkpoint. Restore destination and verify data
   counts/checksums and integrity before production writes start.
4. Validate destination routing, TLS and read-only production workflows. Abort
   if an acceptance check fails. Do not run schema upgrades during this move.
5. With approval, update A and AAAA together. If destination lacks IPv6, remove
   the stale AAAA explicitly. Keep source in maintenance/read-only mode or
   forward stale-DNS clients to destination. Never run two independent writers.
6. Enable one destination writer/job set. Check authoritative DNS and public
   resolvers, both address families, errors, latency, connections and queue work.
   Update CI targets, webhooks, monitoring and external allowlists as agreed.

This tool does not automate these steps or call a DNS provider.

## Rollback and acceptance

Before destination production writes: stop destination, restore original routing
and resume source after checks. After destination writes: freeze destination,
reconcile database/file changes back, validate source, then change routing and
resume it. DNS reversal alone can lose data. If reconciliation is unsupported,
record that limit before cutover and prefer forward repair or explicitly approved
data loss. Keep a single writer during rollback and DNS propagation.

Acceptance requires app-owner signoff on:

- Correct revision, process counts, config and dependency routes.
- Database integrity plus expected counts/checksums at the final checkpoint;
  uploads and file ownership/permissions preserved.
- Valid production TLS, renewal setup, DNS and IPv4/IPv6 behavior.
- Login/session, reads, a controlled production write and key user workflows.
- Exactly one active worker/cron set; no duplicate messages or external effects.
- Errors/latency within agreed thresholds and sufficient disk/build headroom
  throughout the agreed observation window.
- A tested rollback path and encrypted independent backup; retained dependencies
  and source-recovery retention recorded.

Do not start the next app until the pilot is accepted. Retain source data fenced
from writes. Source deletion and credential revocation require separate approval.

## When the app is Docklight

The user-backup API is not a full data backup. Docklight SQLite uses WAL mode:
use a consistent SQLite backup, or stop the app before copying its data. Copy
`server-settings.json` separately. Its values override environment settings and
must not point the restored app back to the old host unintentionally. Recreate
the new container-to-host SSH bridge with verified host keys and new credentials.
Plan a JWT-secret rotation/re-login and validate admin access. Treat audit/history
as sensitive because previous command output may contain config values.

## Verification and next layers

Run server `bun run typecheck`, `bun run lint`, and `bun run test`. The inventory
and CLI tests mock Dokku; they do not contact a VPS. `--help` and built `--help`
check the entry point without executing Dokku. Live report-format and restore
validation require separately approved disposable Dokku hosts.

Follow-up layers must test pinned explicit transport, engine-specific restore,
volume integrity, uncertain remote outcomes, resumable off-host execution,
approval gates, single-writer fencing and rollback after destination writes.
Do not turn the inventory's manual blockers into automatic readiness without
those checks. See the upstream [Dokku backup caveats](https://dokku.com/docs/advanced-usage/backup-recovery/).
