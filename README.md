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

- Dashboard with app status, domains, last deploy, and server health.
- App management: restart, rebuild, scale, config vars, and domains.
- Live app logs over WebSocket.
- Database management: list, create, link/unlink, destroy.
- SSL management with Let's Encrypt.
- Audit logs for command history and filtering.
- Command transparency: exact CLI command, exit code, stdout/stderr.
- Simple auth with admin password and JWT session.

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

#### Deploy to Dokku (Recommended)

```bash
# On your Dokku server
dokku apps:create docklight
dokku config:set docklight DOCKLIGHT_PASSWORD=your-secure-password

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
export DOCKLIGHT_PASSWORD=dev

# Terminal 1
cd server && bun run dev

# Terminal 2
cd client && bun run dev
```

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

| Variable                          | Required                       | Description                                                                         |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `DOCKLIGHT_PASSWORD`              | Yes                            | Admin login password                                                                |
| `DOCKLIGHT_SECRET`                | No                             | JWT signing secret (auto-generated if unset)                                        |
| `DOCKLIGHT_DOKKU_SSH_TARGET`      | No (recommended in production) | SSH target for Dokku commands, for example `dokku@<server-ip>`                      |
| `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` | No                             | Optional root SSH target for root-required commands, for example `root@<server-ip>` |
| `DOCKLIGHT_DOKKU_SSH_KEY_PATH`    | No                             | Private key path inside container                                                   |
| `DOCKLIGHT_DOKKU_SSH_OPTS`        | No                             | Extra SSH options                                                                   |
| `PORT`                            | No                             | Server port (default `3001`)                                                        |

## 🔒 Security Notes

Docklight executes Dokku commands on your server.

- Always set a strong `DOCKLIGHT_PASSWORD`.
- Always expose Docklight behind HTTPS.
- Keep SSH fallback access to your server.
- Command execution is restricted to an allowlist.

### Plugin Management and Root Access

Some plugin commands (`plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`) require root privileges.

Recommended:

- Set `DOCKLIGHT_DOKKU_SSH_TARGET` to `dokku@<server-ip>`
- Set `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET` to `root@<server-ip>`

Alternative:

- Configure passwordless sudo for plugin commands on the `dokku` user.

Troubleshooting details:

- [docs/deployment.md#plugin-management-sudo-errors](docs/deployment.md#plugin-management-sudo-errors)

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
| Logs      | `logs <app> -t -n <lines>`                                                                                                                    |
| Databases | `plugin:list`, `<plugin>:list`, `<plugin>:links`, `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy`                   |
| Plugins   | `plugin:list`, `plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`                                                        |
| SSL       | `letsencrypt:report`, `letsencrypt:ls`, `certs:report`, `letsencrypt:set <app> email <email>`, `letsencrypt:enable`, `letsencrypt:auto-renew` |

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
