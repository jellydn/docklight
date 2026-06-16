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

> **If the URL returns more than one key** (sshid.io and `github.com/<user>.keys` often do), only the first one gets registered — `dokku ssh-keys:add` reads exactly one key per call. Either pipe each line in under its own name (`admin-laptop`, `admin-desktop`, …) or re-run the one-line installer with `ADMIN_SSH_KEY_URL=…`, which loops over every line and registers them as `admin`, `admin-2`, `admin-3`, ….

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

> **Important:** The SSH bridge target must be an address the container can reach.
> The server's public IP may not work from inside a Docker container on some VPS providers.
> Prefer the Docker bridge gateway (e.g., `172.17.0.1`) or an explicit known-good host IP.

```bash
ssh root@<your-server-ip>

# Generate a dedicated key for Docklight (as dokku user)
sudo -u dokku ssh-keygen -t ed25519 -N "" -f /home/dokku/.ssh/docklight

# Authorize the key for dokku user
sudo -u dokku sh -c 'cat /home/dokku/.ssh/docklight.pub >> /home/dokku/.ssh/authorized_keys'

# Mount private key into Docklight container
dokku storage:mount docklight /home/dokku/.ssh/docklight:/app/.ssh/id_ed25519

# Determine the container-reachable host IP.
# The Docker bridge gateway is usually 172.17.0.1 — verify with:
#   docker network inspect bridge | grep Gateway
# Or use: ip -4 addr show docker0
BRIDGE_HOST="172.17.0.1"

# Configure Docklight to use SSH for Dokku commands
dokku config:set docklight \
  DOCKLIGHT_DOKKU_SSH_TARGET=dokku@${BRIDGE_HOST} \
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

## Server health monitoring

The dashboard **Server Health** card shows live VPS resource usage for CPU, memory, and disk. Metrics refresh every 30 seconds.

| Status   | Threshold | Dashboard label |
| -------- | --------- | --------------- |
| OK       | below 70% | OK              |
| Warning  | 70–89%    | Watch closely   |
| Critical | 90%+      | Warning         |

The overall VPS status reflects the worst metric — if disk is at 95% but CPU is low, the banner shows critical.

**Clean unused (operators and admins only):** click **Clean unused** on the Server Health card to run `dokku cleanup`. This removes dead containers and dangling images. It does **not** purge build caches, run `repo:gc`, or execute `docker system prune`.

**Purge build caches (operators and admins only):** when disk status is **Watch closely** or **Warning** (70%+), a second button appears to run `dokku repo:purge-cache` across all apps. Use this as a second tier after **Clean unused** if disk pressure remains. It does **not** remove volumes or run `repo:gc`. Viewers can see health metrics but cannot trigger either action.

If deploys fail with `no space left on device`, see [Disk full during deploy](#disk-full-during-deploy) for SSH-based recovery steps beyond what the dashboard buttons cover.

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

### Automatic updates (opt-in)

The installer can set up a systemd timer that pulls and deploys new commits on a schedule. This is disabled by default.

**Enable at install time:**

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
  | sudo ENABLE_AUTO_UPDATE=1 AUTO_UPDATE_SCHEDULE=daily bash
```

**Enable on an already-installed VPS** by rerunning the installer with `ENABLE_AUTO_UPDATE=1`:

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
  | sudo ENABLE_AUTO_UPDATE=1 bash
```

**Check status:**

```bash
systemctl status docklight-update.timer
journalctl -u docklight-update.service -n 100 --no-pager
```

**Run manually:**

```bash
sudo systemctl start docklight-update.service
```

**How it works:**

- A systemd timer runs `dokku git:sync --build` on the configured repo/branch.
- Before each update, the SQLite database is backed up (default: keep 5 backups).
- Updates use `flock` to prevent overlapping runs.
- The timer, service, and update script are app-name-scoped (e.g. `docklight-update.timer`).

**Security tradeoff:** tracking a branch means trusting that branch for unattended deploys. Keep SSH/root fallback access. Consider pinning to a controlled fork or branch if the upstream repo is not trusted for automatic deployment.

**Private repos:** the Dokku host needs deploy credentials (SSH deploy key or credentialed URL) before `git:sync` can work. Credentialed URLs stored in systemd unit files are sensitive — prefer SSH deploy keys.

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

### New apps get a `*.contaboserver.net` (or other provider) hostname instead of `*.sslip.io`

Dokku assigns each app a default URL of `<app>.<global-vhost>` whenever you don't set a per-app domain. On most VPS providers (Contabo, Hetzner, OVH, etc.) the system hostname is something like `vmi3322923.contaboserver.net`, and Dokku picks that up as the global vhost during bootstrap. Result: new apps end up at `e-ninja.vmi3322923.contaboserver.net` — which doesn't resolve publicly and isn't where you actually want users to land.

**Check the current global vhost:**

```bash
ssh root@<server-ip> dokku domains:report --global
# Domains global vhosts:   vmi3322923.contaboserver.net
```

**Fix it once, for every future app**, by pointing the global vhost at `<ip>.sslip.io` (or your own DNS):

```bash
ssh root@<server-ip> "dokku domains:set-global 217.216.32.119.sslip.io"
```

Now any app you create afterwards will default to `<app>.217.216.32.119.sslip.io`.

**For apps that already exist** with the bad hostname, replace their per-app domains:

```bash
ssh root@<server-ip> bash <<'EOF'
dokku domains:clear e-ninja
dokku domains:set   e-ninja e-ninja.217.216.32.119.sslip.io
dokku proxy:build-config e-ninja
EOF
```

(`domains:clear` removes the inherited Contabo entry; `domains:set` adds the new one and rebuilds the proxy.)

> **Tip:** Pass `GLOBAL_DOMAIN=<value>` to the one-line installer to set this from the start. The default (`<ip>.sslip.io`) is applied automatically; pass `GLOBAL_DOMAIN=` (empty) to keep whatever Dokku auto-detected, or `GLOBAL_DOMAIN=apps.yourdomain.com` to use a real DNS zone you control.

### `dokku letsencrypt:*` says "not a dokku command"

The plugin isn't installed yet. From the server as root:

```bash
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
dokku letsencrypt:set <app> email you@example.com
dokku letsencrypt:enable <app>
dokku letsencrypt:cron-job --add        # auto-renewal
```

If `letsencrypt:enable` then fails the HTTP-01 challenge, walk through the **"App URL shows a random `:NNNN` port"** section above — almost always either a missing port-80 mapping, missing DNS, or a firewall blocking inbound 80/443.

### Uploads fail with `413 Request Entity Too Large`

Dokku's nginx proxy defaults to a **1 MB** request body cap. Any file upload past that fails before it ever reaches your app, with `413 Request Entity Too Large` in the response and a corresponding `client intended to send too large body` line in `dokku nginx:access-logs <app>`.

You set the limit per app — pick the largest media type your app accepts:

| Media  | Typical app-side limit | nginx must allow at least |
| ------ | ---------------------- | ------------------------- |
| Images | 10 MB                  | 10 MB                     |
| Audio  | 10 MB                  | 10 MB                     |
| Video  | 50 MB                  | 50 MB                     |

Set the proxy cap to the **largest** value (50 MB covers all three):

```bash
ssh root@<server-ip> bash <<'EOF'
dokku nginx:set <app> client-max-body-size 50m
dokku proxy:build-config <app>
EOF
```

The setting writes to `/home/dokku/<app>/nginx.conf.d/upload.conf` (or the equivalent under `nginx-vhosts`) as `client_max_body_size 50M;` and survives redeploys.

> **App-side limits still apply.** nginx only controls what reaches your container; per-type caps (images 10 MB, audio 10 MB, video 50 MB) are enforced by the app itself and should be tightened in app config, not in nginx. The nginx limit just needs to be ≥ the largest app-level cap so legitimate uploads aren't cut off before validation.

Verify:

```bash
ssh root@<server-ip> dokku nginx:report <app> | grep -i 'client max body size'
# Nginx client max body size:    50m
```

If you set it but uploads still fail at 1 MB, you forgot `dokku proxy:build-config <app>` (or there's a separate reverse proxy in front, e.g. Cloudflare's own 100 MB cap on the Free plan — check that too).

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

### SSH commands hang or time out after ~60 seconds

Every Dokku action in the dashboard runs over SSH from the container to the host. If `DOCKLIGHT_DOKKU_SSH_TARGET` points at an address the container cannot reach, commands hang until the SSH timeout (typically 60s) and then fail.

Common symptoms:

- All Dokku commands in the dashboard take exactly ~60 seconds and return timeout errors
- `dokku: not found` or `SSH connection failed` in the UI
- The app logs show repeated connection timeout messages

**Diagnosis:**

```bash
# Check the current bridge target
ssh root@<your-server-ip> dokku config:get docklight DOCKLIGHT_DOKKU_SSH_TARGET

# Test reachability from inside the container
dokku enter docklight web sh
ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no dokku@<bridge-target-host> echo ok
```

**Common cause:** Re-running the installer overwrote a working target with the server's public IP, which is unreachable from the container on some VPS providers (see [jellydn/docklight#129](https://github.com/jellydn/docklight/issues/129)).

**Fix:** Set the bridge target to a container-reachable address:

```bash
# Docker bridge gateway (usually works)
ssh root@<your-server-ip> dokku config:set docklight \
  DOCKLIGHT_DOKKU_SSH_TARGET=dokku@172.17.0.1

# Or find the gateway:
ssh root@<your-server-ip> docker network inspect bridge | grep Gateway
```

### Build fails

Check Docker build logs during `git push`. Common causes:

- npm install fails → check `package.json` for issues
- TypeScript compilation fails → run `bun run typecheck` locally first

### Disk full during deploy

Symptoms during `git push dokku …:main` or a GitHub Actions staging deploy:

- `no space left on device` in Docker build logs
- Missing `/tmp/dokku-*` temp directories
- `pushd /: not a git repository` cascading errors
- `pre-receive hook declined`
- `dokku repo:gc <app>` fails with `write error. Out of diskspace`

The missing temp dirs and git errors are symptoms — the root cause is a full disk on the VPS.

**1. Check free space:**

```bash
ssh dokku@<server-ip>  # or ssh root@<server-ip>
df -h /
docker system df
```

**2. Safe cleanup (dokku user or root):**

```bash
# Global: dead containers and dangling images
dokku cleanup

# Per app (repeat for each app on the server)
dokku cleanup <app-name>
dokku repo:purge-cache <app-name>
dokku repo:gc <app-name>
```

**3. Clear stale deploy locks** (after failed deploys):

```bash
ssh root@<server-ip>
rm -f /home/dokku/<app-name>/LOCK
```

**4. Aggressive cleanup (root only)** — use when step 2 is not enough:

```bash
docker builder prune -af
docker system prune -af
# Only if you accept volume removal risk:
# docker system prune -af --volumes
```

**5. Redeploy** once `df -h` shows adequate free space:

```bash
git push dokku <your-branch>:main
```

A non-fast-forward rejection after cleanup is normal when the remote is ahead of your local branch — push the branch you intend to deploy, not necessarily local `main`.

**From Docklight (operators/admins):** use the dashboard in two tiers when disk is full:

1. **Clean unused** — runs `dokku cleanup` (dead containers and dangling images).
2. **Purge build caches** — appears when disk is at warning or critical; runs `dokku repo:purge-cache` across all apps.

Neither button runs `repo:gc` or `docker system prune`. Run `repo:gc` manually over SSH if caches alone are not enough.

**Prevention on multi-app servers:** schedule weekly `dokku cleanup` and monthly `repo:purge-cache` + `repo:gc` across apps. Monitor disk via the Docklight dashboard health panel (warning at 70%, critical at 90%).

### Reset user password

```bash
ssh root@<your-server-ip>
dokku enter docklight web sh
node server/dist/createUser.js <username> <new-password>
```

This will update the password for the user. If the user doesn't exist, it will be created.

## Add-on Services (Worked Example: RabbitMQ)

Dokku ships a family of official service plugins (Postgres, Redis, MariaDB, MongoDB, **RabbitMQ**, …) that follow the same shape: install a plugin, create a service, link it to an app. Below is the end-to-end recipe using [`dokku-rabbitmq`](https://github.com/dokku/dokku-rabbitmq) as the example — the exact same flow applies to any other service plugin by swapping the plugin URL and the `rabbitmq:` namespace.

### 1. Install the plugin (once per server, as root)

```bash
ssh root@<server-ip> "dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git rabbitmq"
```

Verify:

```bash
ssh root@<server-ip> dokku plugin:list | grep rabbitmq
# rabbitmq            1.x.x         enabled    dokku rabbitmq service plugin
```

### 2. Create a RabbitMQ service

```bash
# Default 3.x image; pin a version with --image-version 3.13
ssh root@<server-ip> "dokku rabbitmq:create hermes-queue"
```

This:

- Pulls the `rabbitmq:3-management` image (management UI included)
- Stores data under `/var/lib/dokku/services/rabbitmq/hermes-queue/data` (persistent across container restarts and even plugin upgrades)
- Generates a random user/password
- Exposes AMQP on the **Dokku-internal** network only (not publicly reachable — good)

Inspect:

```bash
ssh root@<server-ip> dokku rabbitmq:info hermes-queue
#   Config dir:           /var/lib/dokku/services/rabbitmq/hermes-queue/config
#   Data dir:             /var/lib/dokku/services/rabbitmq/hermes-queue/data
#   Dsn:                  amqp://hermes-queue:<pass>@dokku-rabbitmq-hermes-queue:5672/hermes-queue
#   Exposed ports:        -
#   Id:                   <docker-id>
#   Internal ip:          172.17.0.X
#   Links:                -
#   Service root:         /var/lib/dokku/services/rabbitmq/hermes-queue
#   Status:               running
#   Version:              rabbitmq:3-management
```

### 3. Link the service to your app

Linking sets a config var (default name: `RABBITMQ_URL`) on the app and brings the service onto the app's Docker network so the hostname `dokku-rabbitmq-hermes-queue` resolves inside the container.

```bash
ssh root@<server-ip> "dokku rabbitmq:link hermes-queue hermes-hub"
# -----> Setting config vars
#        RABBITMQ_URL: amqp://hermes-queue:<pass>@dokku-rabbitmq-hermes-queue:5672/hermes-queue
# -----> Restarting app hermes-hub
```

Your app code now reads `process.env.RABBITMQ_URL` (or the language equivalent) — no hostnames or credentials hard-coded.

Need a different env var name (e.g. several queues, or matching an existing config key)?

```bash
ssh root@<server-ip> "dokku rabbitmq:link hermes-queue hermes-hub --alias QUEUE_URL"
```

### 4. (Optional) Expose the AMQP / management ports for off-server access

By default RabbitMQ is reachable **only** from linked Dokku apps. If you want to connect from your laptop (e.g. with `rabbitmqadmin`, the management UI in a browser, or a CLI client), expose the ports:

```bash
# Map AMQP on 5672 and management UI on 15672 to high host ports
ssh root@<server-ip> "dokku rabbitmq:expose hermes-queue 5672 15672"
ssh root@<server-ip> dokku rabbitmq:info hermes-queue | grep -i exposed
# Exposed ports:   container:5672 -> host:10049 container:15672 -> host:10050
```

Then browse to `http://<server-ip>:10050` (the management UI), or connect with `amqp://<user>:<pass>@<server-ip>:10049/<vhost>`.

> **Lock these down.** The exposed ports skip Dokku's vhost routing and are reachable from anywhere. Either restrict in your VPS firewall (`ufw allow from <your-ip> to any port 10050`), or `dokku rabbitmq:unexpose hermes-queue` as soon as you're done.

### 5. Common operations

```bash
# Backup the data dir (compressed tarball to stdout)
ssh root@<server-ip> "dokku rabbitmq:export hermes-queue" > hermes-queue-$(date +%F).tgz

# Restore
cat hermes-queue-2026-06-01.tgz | ssh root@<server-ip> "dokku rabbitmq:import hermes-queue"

# Upgrade the image (does an in-place container restart, data preserved)
ssh root@<server-ip> "dokku rabbitmq:upgrade hermes-queue --image-version 3.13"

# Unlink + destroy (irreversible — prompts for confirmation)
ssh root@<server-ip> "dokku rabbitmq:unlink hermes-queue hermes-hub"
ssh root@<server-ip> "dokku rabbitmq:destroy hermes-queue"
```

### 6. Gotchas

- **Memory** — RabbitMQ defaults to refusing publishes when free RAM drops below ~40%. On a 2 GB VPS that can trip easily once the app, Docklight, Postgres, and Redis are all running. Tune with: `dokku rabbitmq:set hermes-queue memory-high-watermark 0.5` (50 % of total RAM) or, simpler, give the host more RAM.
- **Persistent volumes survive `destroy`** — `dokku rabbitmq:destroy` removes the container and metadata, but the on-disk message store under `/var/lib/dokku/services/rabbitmq/<name>/data` may need manual cleanup if you want the space back.
- **App must declare the queue** — Dokku gives you a connection string; it does **not** create exchanges/queues for you. That's your app's job at startup.
- **Hostname-only inside the container** — use `dokku-rabbitmq-<service-name>` (or the linked env var), not `localhost`. Inside the container, `localhost` is the app itself.

### Same pattern for other services

| Plugin   | Install URL                                   | Default env var |
| -------- | --------------------------------------------- | --------------- |
| Postgres | `https://github.com/dokku/dokku-postgres.git` | `DATABASE_URL`  |
| Redis    | `https://github.com/dokku/dokku-redis.git`    | `REDIS_URL`     |
| MariaDB  | `https://github.com/dokku/dokku-mariadb.git`  | `DATABASE_URL`  |
| MongoDB  | `https://github.com/dokku/dokku-mongo.git`    | `MONGO_URL`     |
| RabbitMQ | `https://github.com/dokku/dokku-rabbitmq.git` | `RABBITMQ_URL`  |

The `create` / `link` / `expose` / `info` / `export` / `import` / `upgrade` / `destroy` subcommands work identically — substitute the service namespace (`postgres:create`, `redis:link`, etc.).

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
# Use a container-reachable host for the SSH bridge (not the public IP)
BRIDGE_HOST="172.17.0.1"
ssh dokku@<your-server-ip> config:set docklight-staging \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH='/app/.ssh/id_ed25519' \
  DOCKLIGHT_DOKKU_SSH_TARGET="dokku@${BRIDGE_HOST}" \
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

## Uninstall

To completely remove Docklight, Dokku, and all associated data from a VPS, run `scripts/uninstall.sh` as root:

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/uninstall.sh | sudo bash
```

**WARNING:** This is destructive and irreversible. It removes all Dokku apps, databases, SSL certs, and configs. The script requests interactive confirmation (`yes`/`NO`) before proceeding.

### What it removes

1. **Docklight app** — stopped and destroyed via `dokku apps:destroy`
2. **Auto-update timer** — systemd timer and service files removed
3. **Dokku packages** — `dokku` and `herokuish` purged via `apt-get purge`
4. **Dokku data** — `/home/dokku`, `/var/lib/dokku`, `/var/log/dokku` deleted
5. **Dokku user** — system user and group removed
6. **Docker artifacts** — any remaining containers and volumes matching `APP_NAME`

Docker itself is **preserved** by default. Pass `REMOVE_DOCKER=1` to also purge Docker packages and delete `/var/lib/docker`.

### Environment variables

| Variable        | Description                             | Default     |
| --------------- | --------------------------------------- | ----------- |
| `APP_NAME`      | Dokku app name to destroy               | `docklight` |
| `REMOVE_DOCKER` | Also purge Docker (`1`/`0`)             | `0`         |
| `CONFIRM`       | Skip interactive confirmation (`1`/`0`) | `0`         |

### Examples

**Default uninstall (interactive):**

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/uninstall.sh | sudo bash
```

**Non-interactive uninstall with a custom app name:**

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/uninstall.sh \
  | sudo APP_NAME=my-docklight CONFIRM=1 bash
```

**Full purge including Docker:**

```bash
curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/uninstall.sh \
  | sudo REMOVE_DOCKER=1 CONFIRM=1 bash
```

## Security Recommendations

1. **Always use HTTPS** — Enable Let's Encrypt (Step 5)
2. **Strong JWT secret** — Use a long, random string for `JWT_SECRET`
3. **Strong user passwords** — Create admin users with strong passwords
4. **Restrict access** — Consider putting behind:
   - [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/) (free tier available)
   - [Tailscale](https://tailscale.com/) (VPN-only access)
5. **SSH fallback** — If Docklight crashes, you always have `ssh root@<your-server-ip>` to manage Dokku directly
