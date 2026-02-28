<p align="center">
  <img src="./client/public/logo.svg" alt="Docklight Logo" width="128" height="128">
</p>

# Docklight

A minimal, self-hosted web UI for managing a single-node Dokku server.

![License](https://img.shields.io/badge/license-MIT-blue)

## Why

Dokku is powerful but CLI-driven. For solo developers and small teams:

- Non-technical teammates can't use it
- Managing apps via SSH is inconvenient
- No centralized visual overview
- Dokku Pro is expensive for small VPS use cases

Docklight fills the gap — a lightweight, self-hosted UI that wraps the Dokku CLI.

## Architecture

```
Browser → React SPA → Express API → Shell Exec → Dokku CLI → Docker
```

Runs on the same VPS as Dokku. No remote orchestration. No distributed complexity.

## Features

- **Dashboard** — List all apps with status, domains, last deploy. Server health (CPU/memory/disk).
- **App Management** — Restart, rebuild, scale processes, view/edit config vars, manage domains.
- **Live Logs** — Stream app logs in real time via WebSocket.
- **Database Management** — List, create, link/unlink, destroy databases (Postgres, Redis, etc.).
- **SSL Management** — Enable/renew Let's Encrypt certificates.
- **Command Transparency** — Every action shows the exact CLI command, exit code, and output.
- **Auth** — Single admin password, JWT session cookie.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Backend  | Node.js, Express, TypeScript      |
| Frontend | React, Vite, Tailwind, TypeScript |
| Database | SQLite (better-sqlite3)           |
| Logs     | WebSocket (ws)                    |
| Auth     | JWT (jsonwebtoken)                |
| Deploy   | Docker, Dokku                     |

## Quick Start

### Deploy to Dokku (recommended)

```bash
# On your Dokku server
dokku apps:create docklight
dokku config:set docklight DOCKLIGHT_PASSWORD=your-secure-password

# From your local machine (use your server IP)
git remote add dokku dokku@<your-server-ip>:docklight
git push dokku main
```

📖 **[Full deployment guide →](docs/deployment.md)** — SSH keys, domains, HTTPS, persistent storage, troubleshooting.

### Local Development

```bash
# Install dependencies
cd server && bun install && cd ..
cd client && bun install && cd ..

# Set admin password
export DOCKLIGHT_PASSWORD=dev

# Start backend (port 3001)
cd server && bun run dev

# Start frontend (port 5173, proxies /api to backend) — in another terminal
cd client && bun run dev
```

Or with [just](https://github.com/casey/just):

```bash
just install
just server-dev    # terminal 1
just client-dev    # terminal 2
```

### Environment Variables

| Variable             | Required | Description                         |
| -------------------- | -------- | ----------------------------------- |
| `DOCKLIGHT_PASSWORD` | Yes      | Admin login password                |
| `DOCKLIGHT_SECRET`   | No       | JWT signing secret (auto-generated) |
| `DOCKLIGHT_DOKKU_SSH_TARGET` | No (recommended on Dokku deploy) | SSH target used to run Dokku commands (example: `dokku@<server-ip>`). For plugin install/enable/disable/uninstall, use a root SSH user (example: `root@<server-ip>`) or configure passwordless sudo. |
| `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` | No | Optional dedicated SSH target for root-required commands (example: `root@<server-ip>`). Recommended when `DOCKLIGHT_DOKKU_SSH_TARGET` uses `dokku@...`. |
| `DOCKLIGHT_DOKKU_SSH_KEY_PATH` | No | Private key path inside container for Dokku SSH (default ssh key lookup if unset) |
| `DOCKLIGHT_DOKKU_SSH_OPTS` | No | Extra SSH options for Dokku command execution |
| `PORT`               | No       | Server port (default: 3001)         |

## Security

Docklight runs shell commands on your server. For production use:

- **Always** set a strong `DOCKLIGHT_PASSWORD`
- **Always** use HTTPS (Let's Encrypt via Dokku)
- Consider putting behind [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/) or [Tailscale](https://tailscale.com/)
- Commands are restricted to a predefined allowlist — no arbitrary shell execution

> ⚠️ If Docklight crashes, you always have SSH as a fallback. This is a convenience layer, not your only access path.

### Plugin Management Note

Some Dokku plugin commands (`plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`) require root privileges to modify system-level files. These commands run with `sudo`.

#### Why Root Access is Needed

Plugin management commands write to directories like `/var/lib/dokku/plugins/` and may update system configurations. The `dokku` user doesn't have write permissions to these locations by default.

#### Configuration Options

**Option 1: Use a dedicated root SSH target (Recommended)**

Set `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` to route root-required commands directly to root:

```bash
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_TARGET=dokku@<server-ip>
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_ROOT_TARGET=root@<server-ip>
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519
```

This approach keeps normal commands running as the `dokku` user (more secure) while only elevating to root for plugin operations.

**Option 2: Configure passwordless sudo**

Allow the `dokku` user to run plugin commands without a password:

```bash
# On your Dokku server, as root
echo "dokku ALL=(ALL) NOPASSWD: /usr/local/bin/dokku plugin:*" | sudo tee /etc/sudoers.d/docklight
sudo chmod 0440 /etc/sudoers.d/docklight
```

Then use `dokku@<server-ip>` for `DOCKLIGHT_DOKKU_SSH_TARGET`.

#### Troubleshooting

If plugin commands fail with errors like:
- `sudo: no password was provided`
- `sudo: a terminal is required to read the password`
- `sorry, you must have a tty to run sudo`

See the [deployment guide troubleshooting section](docs/deployment.md#plugin-management-sudo-errors).

## Dokku Commands Coverage

| Category  | Commands                                                                                   |
| --------- | ------------------------------------------------------------------------------------------ |
| Apps      | `apps:list`, `ps:report`, `ps:restart`, `ps:rebuild`, `ps:scale`                           |
| Config    | `config:show`, `config:set`, `config:unset`                                                |
| Domains   | `domains:report`, `domains:add`, `domains:remove`                                          |
| Databases | `<plugin>:list`, `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy` |
| Plugins   | `plugin:list`, `plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`     |
| SSL       | `letsencrypt:enable`, `letsencrypt:auto-renew`                                             |

## License

MIT
