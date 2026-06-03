# Deployment Guide

Step-by-step guide to deploy Docklight on your Dokku server.

## TL;DR — One-line install on a fresh VPS

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh | sudo bash
```

Full options (custom domain + HTTPS + pre-authorize your public key for `git push`):

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
  | sudo DOMAIN=docklight.example.com \
         ENABLE_HTTPS=1 LETSENCRYPT_EMAIL=you@example.com \
         ADMIN_SSH_KEY_URL=https://sshid.io/your-handle \
         bash
```

This installs Dokku (if needed), creates the `docklight` app, wires up persistent storage and the container → host SSH bridge, deploys from this repo, prints the generated admin password, and (when `ADMIN_SSH_KEY_URL`/`ADMIN_SSH_KEY` is set) registers your public key with Dokku. See [`scripts/install.sh`](../scripts/install.sh) for all env vars. The rest of this guide covers the manual flow.

### Granting SSH access after install

If you ran the installer without `ADMIN_SSH_KEY_URL`, `ssh dokku@<server-ip>` will prompt for a password. Register your key from your laptop:

```bash
# From sshid.io (or any URL that serves authorized_keys, e.g. https://github.com/<user>.keys)
curl -fsSL https://sshid.io/your-handle \
  | ssh root@<server-ip> "sudo -u dokku dokku ssh-keys:add admin"

# Or from a local public key file
cat ~/.ssh/id_ed25519.pub \
  | ssh root@<server-ip> "sudo -u dokku dokku ssh-keys:add admin"
```

Verify:

```bash
ssh dokku@<server-ip>     # should print Dokku's help banner, no prompt
```

Then `git remote add dokku dokku@<server-ip>:docklight` and `git push dokku main` work without a password.

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

### `ssh dokku@<server>` still prompts for a password

The `dokku` user only accepts public-key auth — there is no password to type. A prompt means none of the keys your SSH client offered matched what's in `dokku ssh-keys:list` on the server.

**1. See which keys your client is actually offering:**

```bash
ssh -v dokku@<server-ip> 2>&1 | grep -E "Offering|Authentications"
```

You'll get lines like:

```
debug1: Offering public key: /Users/you/.ssh/id_ed25519 ED25519 SHA256:wRdXPmfN…
debug1: Authentications that can continue: publickey,password
```

**2. Check which keys the server trusts:**

```bash
ssh root@<server-ip> dokku ssh-keys:list
```

Each line starts with the SHA256 fingerprint:

```
SHA256:pJ2PhyLr… NAME="admin" SSHCOMMAND_ALLOWED_KEYS="…"
```

**3. If no `Offering …` fingerprint matches any registered fingerprint, register the key you actually have on this laptop:**

```bash
cat ~/.ssh/id_ed25519.pub \
  | ssh root@<server-ip> "dokku ssh-keys:add admin-laptop"
```

(Use whichever public key file matches what `ssh -v` was offering. If you only have `id_rsa`, use `~/.ssh/id_rsa.pub`.)

Then `ssh dokku@<server-ip>` should connect immediately and print the Dokku help banner.

#### Common cause: `ADMIN_SSH_KEY_URL` published a key from another machine

If you installed with `ADMIN_SSH_KEY_URL=https://sshid.io/<handle>` (or `github.com/<user>.keys`), the server now trusts whatever public keys that URL serves — which may have been uploaded from a different laptop. The private half isn't on this machine, so SSH falls back to password auth.

Two clean ways to handle it:

- **Add this laptop's key under its own name** (recommended — keeps multi-device access):
  ```bash
  cat ~/.ssh/id_ed25519.pub \
    | ssh root@<server-ip> "dokku ssh-keys:add admin-$(hostname -s)"
  ```
- **Or re-publish to sshid.io / GitHub from this laptop**, then on the server:
  ```bash
  ssh root@<server-ip> "dokku ssh-keys:remove admin"
  curl -fsSL https://sshid.io/<handle> \
    | ssh root@<server-ip> "dokku ssh-keys:add admin"
  ```

> **Tip:** When you run `dokku ssh-keys:add <name>` directly on the server as `root`, it auto-runs under the `dokku` user. The output line `SHA256:xxxx…` is the **fingerprint of the key it just added** — not an error. Confirm with `dokku ssh-keys:list`.

### App URL shows a random `:NNNN` port and HTTPS won't enable

After a successful deploy you may see Dokku print a URL like `http://hermes-hub.<server>.contaboserver.net:8008`, and `dokku letsencrypt:enable hermes-hub` fails with a challenge/validation error. This means two things:

- Dokku didn't bind the app to port **80**, so it picked a random high port.
- Let's Encrypt's HTTP-01 challenge needs to reach the app on port **80** on the domain you're certifying.

**Worked example** — deploying [`jellydn/hermes-hub`](https://github.com/jellydn/hermes-hub) end-to-end with a domain and HTTPS:

```bash
# 1. Create the app (or use Docklight's "Create app" UI)
ssh dokku@<server-ip> apps:create hermes-hub

# 2. Push code from your laptop
git remote add dokku dokku@<server-ip>:hermes-hub
git push dokku main

# At this point Dokku might announce something like:
#   http://hermes-hub.<host>.contaboserver.net:8008

# 3. Inspect the proxy port mapping
ssh root@<server-ip> dokku proxy:ports hermes-hub
# Example output:
#   -----> Port mappings for hermes-hub
#   scheme  host port  container port
#   http    8008       3000

# 4. Map the host side to port 80 (keep the container port from step 3)
ssh root@<server-ip> "dokku proxy:ports-remove hermes-hub http:8008:3000"
ssh root@<server-ip> "dokku proxy:ports-add    hermes-hub http:80:3000"

# 5. Set the public domain (must resolve to <server-ip>)
ssh root@<server-ip> "dokku domains:set hermes-hub hermes-hub.yourdomain.com"

# 6. Now Let's Encrypt can complete the HTTP-01 challenge
ssh root@<server-ip> "dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git" 2>/dev/null || true
ssh root@<server-ip> "dokku letsencrypt:set hermes-hub email you@example.com"
ssh root@<server-ip> "dokku letsencrypt:enable hermes-hub"
ssh root@<server-ip> "dokku letsencrypt:cron-job --add"
```

After step 6 the app is reachable at `https://hermes-hub.yourdomain.com` on bare 443, with HTTP→HTTPS redirect and auto-renewal enabled.

**Checklist if it still fails:**

- `dig +short hermes-hub.yourdomain.com` returns your server IP (DNS has propagated)
- `curl -I http://hermes-hub.yourdomain.com` returns a Dokku-proxied response, not connection-refused
- `ufw status` / cloud-provider firewall allows **80** and **443** inbound
- The container actually listens on the port shown as "container port" — verify with `dokku logs hermes-hub` and the app's own startup message

> **Note:** The Docklight one-line installer handles all of this automatically when you pass `DOMAIN=…` plus `ENABLE_HTTPS=1 LETSENCRYPT_EMAIL=…`. The steps above are for apps deployed separately (any app, not just Docklight), or when you skipped those flags and want to add HTTPS after the fact.

### `dokku git:sync` fails on a private GitHub repo

When you click **Sync from Git** in Docklight (or run `dokku git:sync --build my-app https://github.com/owner/repo.git`) for a **private** repo, the clone fails with:

```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

`git` on the Dokku host has no GitHub credentials and there's no TTY to prompt on. Three ways to fix it, in order of preference:

#### Option A — Deploy key over SSH (recommended for one repo)

```bash
# On the Dokku server (as root)
sudo -u dokku ssh-keygen -t ed25519 -N "" -f /home/dokku/.ssh/gh_e-ninja -C "dokku@e-ninja"
sudo -u dokku tee -a /home/dokku/.ssh/config >/dev/null <<EOF

Host github.com-e-ninja
  HostName github.com
  User git
  IdentityFile /home/dokku/.ssh/gh_e-ninja
  IdentitiesOnly yes
EOF
cat /home/dokku/.ssh/gh_e-ninja.pub
# → copy the printed line
```

In **GitHub → repo → Settings → Deploy keys → Add deploy key**, paste the line. Read-only is enough.

Then sync using the SSH-aliased host:

```bash
dokku git:sync --build e-ninja git@github.com-e-ninja:jellydn/e-ninja.git main
```

The alias (`github.com-e-ninja`) keeps each repo's deploy key isolated from the others.

#### Option B — Personal access token in the URL

Quick for a one-off, but the token ends up in Dokku logs and command history. Create a fine-grained PAT with `Contents: Read-only` for that repo, then:

```bash
dokku git:sync --build e-ninja \
  https://oauth2:<TOKEN>@github.com/jellydn/e-ninja.git main
```

Rotate the token if you suspect leakage.

#### Option C — Push from your laptop instead of `git:sync`

If your laptop already has GitHub auth, skip server-side cloning entirely:

```bash
# laptop
git clone git@github.com:jellydn/e-ninja.git
cd e-ninja
git remote add dokku dokku@<server-ip>:e-ninja
git push dokku main
```

This is also the simplest way to deploy a branch other than `main` (`git push dokku feature-x:main`).

### `dokku letsencrypt:*` says "not a dokku command"

The plugin isn't installed yet. From the server as root:

```bash
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
dokku letsencrypt:set <app> email you@example.com
dokku letsencrypt:enable <app>
dokku letsencrypt:cron-job --add        # auto-renewal
```

If `letsencrypt:enable` then fails the HTTP-01 challenge, walk through the **"App URL shows a random `:NNNN` port"** section above — almost always either a missing port-80 mapping, missing DNS, or a firewall blocking inbound 80/443.

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
