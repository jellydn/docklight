<p align="center">
  <img src="./client/public/logo.svg" alt="Docklight logo" width="128" height="128">
</p>

# Docklight

A minimal, self-hosted web UI for managing a single-node Dokku server.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)

## Motivation

Dokku is powerful but CLI-driven. For solo developers and small teams:

- Non-technical teammates can't use it
- Managing apps via SSH is inconvenient
- No centralized visual overview
- Dokku Pro is expensive for small VPS use cases

Docklight fills the gap — a lightweight, self-hosted UI that wraps the Dokku CLI.

## Overview

Dokku is powerful, but primarily CLI-driven. Docklight adds a lightweight web interface so you can manage apps, databases, domains, SSL, and operational visibility from one place.

Architecture:

```
Browser -> React SPA -> Express API -> Shell Exec -> Dokku CLI -> Docker
```

Docklight is designed to run on the same VPS as Dokku.

## ✨ Features

- Dashboard with app status, domains, last deploy, and VPS health (CPU, memory, disk) with warning/critical thresholds.
- One-click server cleanup from the dashboard for operators and admins: **Clean unused** runs `dokku cleanup` (removes unused containers and images); **Purge build caches** runs `dokku repo:purge-cache` across all apps when disk is warning or critical (does not remove volumes or run `repo:gc`).
- App management: restart, rebuild, scale, config vars, and domains.
- Real-time app status updates via WebSocket push notifications.
- Live app logs over WebSocket.
- Git integration: deploy apps from remote repositories.
- Server settings configuration via UI.
- Database management: list, create, link/unlink, destroy.
- SSL management with Let's Encrypt.
- Audit logs for command history, filtering, and export (JSON/CSV).
- Command transparency: exact CLI command, exit code, stdout/stderr.
- Enhanced health checks with Dokku connectivity and database status.
- Simple auth with username/password and JWT session.

## 🧱 Tech Stack

| Layer      | Stack                                 |
| ---------- | ------------------------------------- |
| Backend    | Node.js, Express, TypeScript          |
| Frontend   | React, Vite, Tailwind CSS, TypeScript |
| Database   | SQLite (`better-sqlite3`)             |
| Realtime   | WebSocket (`ws`)                      |
| Auth       | JWT (`jsonwebtoken`)                  |
| Deployment | Docker, Dokku                         |

## 🚀 Getting Started

### Installation

#### One-line install (fresh VPS — installs Dokku + Docklight)

On a fresh Ubuntu/Debian VPS, run as root:

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh | sudo bash
```

With a custom domain, HTTPS, and your public SSH key pre-registered for `git push` access:

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
  | sudo DOMAIN=docklight.example.com \
         ENABLE_HTTPS=1 LETSENCRYPT_EMAIL=you@example.com \
         ADMIN_SSH_KEY_URL=https://sshid.io/your-handle \
         bash
```

The installer will:

1. Install Dokku (if not already present)
2. Create the `docklight` app and persistent storage
3. Configure the container → host SSH bridge for the Dokku CLI
4. Generate a `JWT_SECRET`
5. Deploy Docklight from this repo
6. Create an initial admin user and print the password
7. (Optional) Register your public key with Dokku so you can `git push dokku main` and `ssh dokku@<ip>` without a password

Available env vars: `APP_NAME`, `DOMAIN`, `REPO_URL`, `BRANCH`, `DOKKU_VERSION`, `ENABLE_HTTPS`, `LETSENCRYPT_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SSH_KEY_URL`, `ADMIN_SSH_KEY`, `GLOBAL_DOMAIN`.

> By default the installer sets Dokku's **global vhost** to `<ip>.sslip.io`, so any future app you create (Docklight or otherwise) gets a usable URL like `<app>.<ip>.sslip.io` out of the box — instead of inheriting the provider's system hostname (e.g. `*.contaboserver.net`). Override with `GLOBAL_DOMAIN=apps.yourdomain.com`, or pass `GLOBAL_DOMAIN=` (empty) to keep Dokku's auto-detected value.

**Already installed without `ADMIN_SSH_KEY_URL`?** Add your key from your laptop:

```bash
# Single key from a local file
cat ~/.ssh/id_ed25519.pub \
  | ssh root@<server-ip> "sudo -u dokku dokku ssh-keys:add admin"

# Single key from sshid.io / github.com/<user>.keys
curl -fsSL https://sshid.io/your-handle \
  | ssh root@<server-ip> "sudo -u dokku dokku ssh-keys:add admin"
```

> **Multiple keys?** `dokku ssh-keys:add` accepts **one key per call**. If `https://sshid.io/<handle>` or `https://github.com/<user>.keys` returns several lines, pipe them in individually under distinct names (`admin-laptop`, `admin-desktop`, …), or — easier — re-run the installer with `ADMIN_SSH_KEY_URL=…`, which loops over every line and registers them as `admin`, `admin-2`, `admin-3`, ….

> **Still getting `dokku@<host>'s password:` after adding a key?** Your local key probably doesn't match what was registered (common when `ADMIN_SSH_KEY_URL` published a key from another machine). See [docs/deployment.md → SSH still prompts for a password](docs/deployment.md#ssh-dokkuserver-still-prompts-for-a-password) for the 3-step debug + fix.

#### Manual deploy to existing Dokku

```bash
# On your Dokku server
dokku apps:create docklight
dokku config:set docklight JWT_SECRET=your-secure-random-secret

# From your local machine
git remote add dokku dokku@<your-server-ip>:docklight
git push dokku main
```

Full guide: [docs/deployment.md](docs/deployment.md)

#### From Source (Local Development)

```bash
# Install dependencies
cd server && bun install
cd ../client && bun install
cd ..

# Required env
export JWT_SECRET=dev-secret-change-in-production

# Terminal 1
cd server && bun run dev

# Terminal 2
cd client && bun run dev
```

**First-time setup**: After starting the server, create an admin user:

```bash
cd server
npx tsx createUser.ts admin your-password-here
```

Then open http://localhost:5173 and log in with the credentials you created.

Or use `just`:

```bash
just install
just server-dev
just client-dev
```

## 🛠️ Build Commands

```bash
# Show available commands
just

# Install dependencies
just install

# Run dev servers
just server-dev
just client-dev

# Quality checks
just lint
just format
just typecheck
just test

# Build
just build
```

## 🔧 Environment Variables

| Variable                            | Required                       | Description                                                            |
| ----------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `JWT_SECRET`                        | Yes (in production)            | JWT signing secret                                                     |
| `DOCKLIGHT_DOKKU_SSH_TARGET`        | No (recommended in production) | SSH target for Dokku commands, for example `dokku@<server-ip>`         |
| `DOCKLIGHT_DOKKU_SSH_KEY_PATH`      | No                             | Private key path inside container                                      |
| `DOCKLIGHT_DOKKU_SSH_OPTS`          | No                             | Extra SSH options                                                      |
| `PORT`                              | No                             | Server port (default `3001`)                                           |
| `DOCKLIGHT_RATE_LIMIT_WINDOW_MS`    | No                             | Rate limit window in ms (default `900000` = 15 min)                    |
| `DOCKLIGHT_AUTH_MAX_REQUESTS`       | No                             | Max auth login requests per window (default `5`, dev: `1000`)          |
| `DOCKLIGHT_AUTH_CHECK_MAX_REQUESTS` | No                             | Max auth check requests per window (default `300`, dev: `10000`)       |
| `DOCKLIGHT_COMMAND_WINDOW_MS`       | No                             | Command rate limit window in ms (default `60000` = 1 min)              |
| `DOCKLIGHT_COMMAND_MAX_REQUESTS`    | No                             | Max command executions per window per user (default `30`, dev: `1000`) |
| `DOCKLIGHT_ADMIN_MAX_REQUESTS`      | No                             | Max admin API requests per window (default `30`, dev: `1000`)          |

### One-line installer env vars

These are only used by `scripts/install.sh` (the one-line install):

| Variable            | Required            | Description                                                                  |
| ------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `APP_NAME`          | No                  | Dokku app name (default `docklight`)                                         |
| `DOMAIN`            | No                  | Custom domain (default `<ip>.sslip.io`)                                      |
| `REPO_URL`          | No                  | Git repo to deploy (default this repo)                                       |
| `BRANCH`            | No                  | Branch to deploy (default `main`)                                            |
| `DOKKU_VERSION`     | No                  | Dokku version to install (default `v0.35.20`)                                |
| `ENABLE_HTTPS`      | No                  | Run Let's Encrypt after deploy (`1`/`0`, default `0`)                        |
| `LETSENCRYPT_EMAIL` | If `ENABLE_HTTPS=1` | Email for Let's Encrypt                                                      |
| `ADMIN_USERNAME`    | No                  | Initial admin username (default `admin`)                                     |
| `ADMIN_PASSWORD`    | No                  | Initial admin password (default auto-generated)                              |
| `ADMIN_SSH_KEY_URL` | No                  | URL returning operator's SSH public key (e.g. `https://sshid.io/<handle>`)   |
| `ADMIN_SSH_KEY`     | No                  | Inline SSH public key content (alternative to URL)                           |
| `GLOBAL_DOMAIN`     | No                  | Override Dokku global vhost (default `<ip>.sslip.io`, empty to keep current) |

## 🔒 Security Notes

Docklight executes Dokku commands on your server.

- Always set a strong `JWT_SECRET`.
- Always expose Docklight behind HTTPS.
- Keep SSH fallback access to your server.
- Command execution is restricted to an allowlist.
- Create admin users via CLI or database for access.

## 📦 Project Structure

```text
docklight/
├── client/           # React + Vite frontend
├── server/           # Express + TypeScript backend
├── docs/             # Documentation (deployment, etc.)
├── .github/workflows # CI/CD workflows
└── justfile          # Task runner commands
```

## 🧪 Dokku Command Coverage

| Category  | Commands                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Apps      | `apps:list`, `apps:create`, `apps:destroy`, `ps:report`, `ps:restart`, `ps:stop`, `ps:start`, `ps:rebuild`, `ps:scale`                        |
| Config    | `config:show`, `config:set`, `config:unset`                                                                                                   |
| Domains   | `domains:report`, `domains:add`, `domains:remove`                                                                                             |
| Git       | `git:report`, `git:sync --build`                                                                                                              |
| Logs      | `logs <app> -t -n <lines>`                                                                                                                    |
| Databases | `plugin:list`, `<plugin>:list`, `<plugin>:links`, `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy`                   |
| Plugins   | `plugin:list`, `plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`                                                        |
| SSL       | `letsencrypt:report`, `letsencrypt:ls`, `certs:report`, `letsencrypt:set <app> email <email>`, `letsencrypt:enable`, `letsencrypt:auto-renew` |
| Server    | `cleanup`, `repo:purge-cache`                                                                                                                 |

## 🤝 Contributing

Contributions are welcome. Please read our contributing guidelines before submitting PRs.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

👤 **Dung Huynh**

- Website: [https://productsway.com](https://productsway.com)
- Twitter: [@jellydn](https://twitter.com/jellydn)
- GitHub: [@jellydn](https://github.com/jellydn)

## Show your support

Give a ⭐️ if this project helped you!

[![kofi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/dunghd)
[![paypal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/dunghd)
[![buymeacoffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dunghd)
