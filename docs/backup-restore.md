# Backup and Restore

How to back up and restore Docklight configuration (users and settings).

## What is backed up

The backup includes:

- **Users** — all accounts with their usernames, hashed passwords, roles, and creation timestamps
- **Environment configuration reference** — which env vars are set (values are **not** exported)

> **Note:** The SQLite command history and audit log are not included in the backup. Only the configuration needed to restore access and user accounts is exported.

## Download a backup

Send a `GET /api/admin/backup` request as an admin user. The response is a JSON file attachment.

### Via curl

```bash
curl -s -b "session=<your-session-token>" \
  https://docklight.yourdomain.com/api/admin/backup \
  -o docklight-backup-$(date +%F).json
```

The downloaded file looks like:

```json
{
  "version": "1.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "users": [
    {
      "username": "admin",
      "password_hash": "abc123:...",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "envConfig": {
    "JWT_SECRET": true,
    "DOCKLIGHT_DOKKU_SSH_TARGET": true,
    "DOCKLIGHT_DOKKU_SSH_KEY_PATH": true,
    "DOCKLIGHT_DOKKU_SSH_OPTS": false,
    "LOG_LEVEL": false,
    "NODE_ENV": true
  }
}
```

`envConfig` shows which environment variables are **present** on the server (not their values). Use this as a checklist when migrating to a new server.

## Restore from a backup

Send a `POST /api/admin/restore` request with the backup JSON as the request body.

### Via curl

```bash
curl -s -b "session=<your-session-token>" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @docklight-backup-2024-01-15.json \
  https://docklight.yourdomain.com/api/admin/restore
```

A successful response:

```json
{ "success": true }
```

### Restore behaviour

- Users in the backup are **upserted** — existing accounts with the same username are updated; accounts not present in the backup are left untouched.
- The backup must contain at least one `admin` role user; restores without an admin are rejected to prevent lockout.
- `createdAt` timestamps are preserved from the backup.

## Scheduled automated backups

Use a cron job on the host to download a backup daily and keep the last 7:

```bash
# /etc/cron.d/docklight-backup
0 2 * * * root \
  curl -s -b "session=<session-token>" \
    https://docklight.yourdomain.com/api/admin/backup \
    -o /var/backups/docklight/backup-$(date +\%F).json && \
  find /var/backups/docklight -name 'backup-*.json' -mtime +7 -delete
```

Create the backup directory first:

```bash
mkdir -p /var/backups/docklight
```

## Migration to a new server

1. **Download the backup** from the old server (see above).
2. **Deploy Docklight** on the new server following the [Deployment Guide](deployment.md).
3. **Set environment variables** on the new server — use the `envConfig` section of the backup as a checklist.
4. **Restore the backup** to the new server (see above).
5. **Verify** by logging in with an admin account from the backup.

## Security notes

- Backup files contain **hashed** passwords. While they cannot be reversed to plain text, treat them as sensitive and store them securely (e.g., encrypted storage, restricted file permissions).
- The session token used for backup/restore requests must belong to an `admin` user.
- Backup/restore endpoints are rate-limited to 30 requests per 15-minute window.
