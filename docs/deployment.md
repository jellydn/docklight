# Deployment Guide

Step-by-step guide to deploy Docklight on your Dokku server.

## Prerequisites

- A VPS with [Dokku](https://dokku.com/docs/getting-started/installation/) installed
- SSH access to your server (root or dokku user)
- Git installed on your local machine
- An SSH key pair (`~/.ssh/id_rsa.pub`)

## Step 1: Add your SSH key to Dokku

Dokku requires key-based auth for `git push` deploys. From your **local machine**:

```bash
cat ~/.ssh/id_rsa.pub | ssh root@<your-server-ip> dokku ssh-keys:add admin
```

Verify it worked:

```bash
ssh dokku@<your-server-ip>
# Should print: "Use 'dokku help' for available commands"
```

> **Tip:** Replace `<your-server-ip>` with your VPS IP address (e.g., `95.111.232.131`) throughout this guide.

## Step 2: Create the app on your server

SSH into your server and create the Docklight app:

```bash
ssh root@<your-server-ip>

# Create the app
dokku apps:create docklight

# Set a JWT secret (required in production — generates a secure random string)
dokku config:set docklight JWT_SECRET="$(openssl rand -base64 32)"
```

Or as one-liners from your local machine:

```bash
ssh root@<your-server-ip> dokku apps:create docklight
ssh root@<your-server-ip> dokku config:set docklight JWT_SECRET="$(openssl rand -base64 32)"
```

> **Note:** When using `ssh dokku@<your-server-ip>`, do **not** prefix commands with `dokku` — the dokku shell adds it automatically. Use `ssh dokku@<your-server-ip> config:set ...`, not `ssh dokku@<your-server-ip> dokku config:set ...`.

## Step 2.5: Configure Dokku CLI access from container (required)

Docklight runs inside a container, so `dokku` is not available as a local binary there.
Configure Docklight to execute Dokku commands via SSH back to the host.

```bash
ssh root@<your-server-ip>

# Generate a dedicated key for Docklight (as dokku user)
sudo -u dokku ssh-keygen -t ed25519 -N "" -f /home/dokku/.ssh/docklight

# Authorize the key for dokku user
sudo -u dokku sh -c 'cat /home/dokku/.ssh/docklight.pub >> /home/dokku/.ssh/authorized_keys'

# Mount private key into Docklight container
dokku storage:mount docklight /home/dokku/.ssh/docklight:/app/.ssh/id_ed25519

# Configure Docklight to use SSH for Dokku commands
dokku config:set docklight \
  DOCKLIGHT_DOKKU_SSH_TARGET=dokku@<your-server-ip> \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519
```

## Step 3: Configure domain (optional but recommended)

```bash
# Set your domain
dokku domains:set docklight docklight.yourdomain.com

# Remove the default domain if needed
dokku domains:remove docklight docklight.<dokku-global-domain>
```

If you don't set a custom domain, Dokku assigns one based on its global domain setting.

## Step 4: Deploy from your local machine

```bash
# Clone the repo (or navigate to your existing copy)
git clone https://github.com/jellydn/docklight.git
cd docklight

# Add Dokku as a git remote (use your server IP)
git remote add dokku dokku@<your-server-ip>:docklight

# Deploy
git push dokku main
```

Dokku will:

1. Detect the `Dockerfile`
2. Build the multi-stage Docker image (client + server)
3. Start the container
4. Run the healthcheck (`/api/health`)
5. Route traffic to the app

You should see output ending with:

```
=====> Application deployed:
       http://docklight.yourdomain.com
```

## Step 5: Enable HTTPS with Let's Encrypt

```bash
ssh root@<your-server-ip>

# Install the Let's Encrypt plugin (if not already installed)
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git

# Set your email for Let's Encrypt
dokku letsencrypt:set docklight email you@example.com

# Enable SSL
dokku letsencrypt:enable docklight
```

## Step 6: Verify

Open your browser and navigate to:

```
https://docklight.yourdomain.com
```

You should see the login page.

## Step 6.5: Create initial admin user

Docklight uses multi-user authentication. After deployment, create your first admin user via SSH:

```bash
ssh root@<your-server-ip>

# Access the running container (Alpine-based, uses sh)
dokku enter docklight web sh

# Create an admin user (password can be passed as argument or will be prompted)
node server/dist/createUser.js admin your-password-here

# Exit the container
exit
```

Now you can log in with the username and password you just created.

## Persistent Storage (Important)

Docklight uses SQLite to store command history and user accounts. By default, the database path is controlled by the `DOCKLIGHT_DB_PATH` environment variable (defaults to `data/docklight.db` relative to the working directory). In the Docker container, this resolves to `/app/data/docklight.db`.

Without persistent storage, the database is **lost on every redeploy**. To persist it:

```bash
ssh root@<your-server-ip>

# Create a persistent storage directory on the host
mkdir -p /var/lib/dokku/data/storage/docklight

# Mount it into the container
dokku storage:mount docklight /var/lib/dokku/data/storage/docklight:/app/data

# Redeploy to apply
dokku ps:rebuild docklight
```

Alternatively, you can set a custom database path:

```bash
dokku config:set docklight DOCKLIGHT_DB_PATH=/app/data/docklight.db
```

## Updating

To deploy a new version:

```bash
# From your local machine
cd docklight
git pull origin main    # or make your changes
git push dokku main
```

Dokku performs zero-downtime deploys by default.

## Troubleshooting

Your SSH key isn't registered with Dokku:

```bash
cat ~/.ssh/id_rsa.pub | ssh root@<your-server-ip> dokku ssh-keys:add admin
```

### "Could not resolve hostname"

Use the IP address, not the hostname:

```bash
git remote set-url dokku dokku@<your-server-ip>:docklight
```

### App crashes or won't start

Check the logs:

```bash
ssh root@<your-server-ip>
dokku logs docklight --num 100
```

Common issues:

- `JWT_SECRET` not set → `dokku config:set docklight JWT_SECRET=$(openssl rand -base64 32)`
- `dokku: not found` in dashboard → configure Step 2.5 (Dokku SSH access)
- Port conflict → Dokku handles port mapping automatically, no manual config needed
- Can't log in → Make sure you've created an admin user via `dokku enter docklight web sh` and `node server/dist/createUser.js admin your-password-here`

### Build fails

Check Docker build logs during `git push`. Common causes:

- npm install fails → check `package.json` for issues
- TypeScript compilation fails → run `bun run typecheck` locally first

### Reset user password

```bash
ssh root@<your-server-ip>
dokku enter docklight web sh
node server/dist/createUser.js <username> <new-password>
```

This will update the password for the user. If the user doesn't exist, it will be created.

## Staging Environment (PR Preview)

Docklight supports automatic staging deployments for pull requests via GitHub Actions.

### One-time setup

#### 1. Create a deploy key

Generate a dedicated SSH key for GitHub Actions:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/dokku_deploy -N ""

# Add the public key to Dokku
cat ~/.ssh/dokku_deploy.pub | ssh root@<your-server-ip> dokku ssh-keys:add github-actions
```

#### 2. Add GitHub secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret          | Value                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| `DOKKU_SSH_KEY` | Contents of `~/.ssh/dokku_deploy` (the private key, including `-----BEGIN/END-----` lines) |
| `DOKKU_HOST`    | Your server IP or hostname (e.g., `95.111.232.131`)                                        |

#### 3. Create the staging app on Dokku

```bash
# Create the app
ssh dokku@<your-server-ip> apps:create docklight-staging

# Copy config from production (adjust values as needed)
ssh dokku@<your-server-ip> config:set docklight-staging \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH='/app/.ssh/id_ed25519' \
  DOCKLIGHT_DOKKU_SSH_TARGET='dokku@<your-server-ip>' \
  JWT_SECRET='staging-secret'

# Mount the SSH key (same as production setup)
dokku storage:mount docklight-staging /home/dokku/.ssh/docklight:/app/.ssh/id_ed25519

# (Optional) Set a staging domain
ssh dokku@<your-server-ip> domains:set docklight-staging staging.yourdomain.com
```

### How it works

The workflow at `.github/workflows/deploy-staging.yml` runs on every PR push:

1. Checks out the PR branch
2. Pushes it to the `docklight-staging` Dokku app
3. Comments the staging URL on the PR

### Manual deployment

To deploy any branch to staging manually:

```bash
# Add the staging remote (one-time)
git remote add staging dokku@<your-server-ip>:docklight-staging

# Deploy a branch
git push staging your-branch:main --force
```

## Security Recommendations

1. **Always use HTTPS** — Enable Let's Encrypt (Step 5)
2. **Strong JWT secret** — Use a long, random string for `JWT_SECRET`
3. **Strong user passwords** — Create admin users with strong passwords
4. **Restrict access** — Consider putting behind:
   - [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/) (free tier available)
   - [Tailscale](https://tailscale.com/) (VPN-only access)
5. **SSH fallback** — If Docklight crashes, you always have `ssh root@<your-server-ip>` to manage Dokku directly
