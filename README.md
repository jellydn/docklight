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

# From your local machine
git remote add dokku dokku@your-server:docklight
git push dokku main
```

### Local Development

```bash
# Install dependencies
bun install

# Start backend (port 3001)
bun run dev:server

# Start frontend (port 5173, proxies /api to backend)
bun run dev:client

# Set admin password
export DOCKLIGHT_PASSWORD=dev
```

### Environment Variables

| Variable             | Required | Description                         |
| -------------------- | -------- | ----------------------------------- |
| `DOCKLIGHT_PASSWORD` | Yes      | Admin login password                |
| `DOCKLIGHT_SECRET`   | No       | JWT signing secret (auto-generated) |
| `PORT`               | No       | Server port (default: 3001)         |

## Security

Docklight runs shell commands on your server. For production use:

- **Always** set a strong `DOCKLIGHT_PASSWORD`
- **Always** use HTTPS (Let's Encrypt via Dokku)
- Consider putting behind [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/) or [Tailscale](https://tailscale.com/)
- Commands are restricted to a predefined allowlist — no arbitrary shell execution

> ⚠️ If Docklight crashes, you always have SSH as a fallback. This is a convenience layer, not your only access path.

## Dokku Commands Coverage

| Category  | Commands                                                                                   |
| --------- | ------------------------------------------------------------------------------------------ |
| Apps      | `apps:list`, `ps:report`, `ps:restart`, `ps:rebuild`, `ps:scale`                           |
| Config    | `config:show`, `config:set`, `config:unset`                                                |
| Domains   | `domains:report`, `domains:add`, `domains:remove`                                          |
| Databases | `<plugin>:list`, `<plugin>:create`, `<plugin>:link`, `<plugin>:unlink`, `<plugin>:destroy` |
| SSL       | `letsencrypt:enable`, `letsencrypt:auto-renew`                                             |

## License

MIT
