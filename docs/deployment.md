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

# Set a strong admin password
dokku config:set docklight DOCKLIGHT_PASSWORD=<your-secure-password>

# (Optional) Set a custom JWT secret — if not set, a default is used
dokku config:set docklight DOCKLIGHT_SECRET=<random-secret-string>
```

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

### Step 2.6: Configure root access for plugin management (recommended)

Plugin management commands (`plugin:install`, `plugin:enable`, `plugin:disable`, `plugin:uninstall`) require root privileges. The recommended approach is to use a dedicated root SSH target for these commands.

```bash
ssh root@<your-server-ip>

# Generate a dedicated key for root access (as root user)
ssh-keygen -t ed25519 -N "" -f /root/.ssh/docklight_root

# Authorize the key for root user
cat /root/.ssh/docklight_root.pub >> /root/.ssh/authorized_keys

# Mount private key into Docklight container
dokku storage:mount docklight /root/.ssh/docklight_root:/app/.ssh/id_ed25519_root

# Configure Docklight to use root SSH target for plugin commands
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_ROOT_TARGET=root@<your-server-ip>
```

With this configuration:
- Normal commands (apps, config, logs, etc.) run as the `dokku` user via `DOCKLIGHT_DOKKU_SSH_TARGET`
- Plugin commands run as root via `DOCKLIGHT_DOKKU_SSH_ROOT_TARGET`

**Alternative: Passwordless sudo**

If you prefer not to use root SSH, configure passwordless sudo for the dokku user:

```bash
# On your Dokku server, as root
echo "dokku ALL=(ALL) NOPASSWD: /usr/local/bin/dokku plugin:*" | sudo tee /etc/sudoers.d/docklight
sudo chmod 0440 /etc/sudoers.d/docklight
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

You should see the login page. Enter the password you set in Step 2.

## Persistent Storage (Important)

Docklight uses SQLite to store command history. By default, the database lives inside the container and is **lost on every redeploy**. To persist it:

```bash
ssh root@<your-server-ip>

# Create a persistent storage directory on the host
mkdir -p /var/lib/dokku/data/storage/docklight

# Mount it into the container
dokku storage:mount docklight /var/lib/dokku/data/storage/docklight:/app/data

# Redeploy to apply
dokku ps:rebuild docklight
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

### Plugin management sudo errors

When installing, enabling, disabling, or uninstalling plugins, you may encounter errors like:

```
sudo: no password was provided
sudo: a terminal is required to read the password
sorry, you must have a tty to run sudo
```

These errors occur because plugin commands require root access, and the default `dokku` user cannot run sudo commands interactively.

**Solution 1: Use DOCKLIGHT_DOKKU_SSH_ROOT_TARGET (Recommended)**

Follow [Step 2.6](#step-26-configure-root-access-for-plugin-management-recommended) to configure a dedicated root SSH target.

**Solution 2: Configure passwordless sudo**

```bash
# On your Dokku server, as root
echo "dokku ALL=(ALL) NOPASSWD: /usr/local/bin/dokku plugin:*" | sudo tee /etc/sudoers.d/docklight
sudo chmod 0440 /etc/sudoers.d/docklight
```

**Solution 3: Use root as DOCKLIGHT_DOKKU_SSH_TARGET**

Not recommended for security reasons, but you can set both SSH targets to root:

```bash
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_TARGET=root@<your-server-ip>
dokku config:set docklight DOCKLIGHT_DOKKU_SSH_ROOT_TARGET=root@<your-server-ip>
```

### "Permission denied" on git push

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
- `DOCKLIGHT_PASSWORD` not set → `dokku config:set docklight DOCKLIGHT_PASSWORD=...`
- `dokku: not found` in dashboard → configure Step 2.5 (Dokku SSH access)
- Port conflict → Dokku handles port mapping automatically, no manual config needed

### Build fails

Check Docker build logs during `git push`. Common causes:
- npm install fails → check `package.json` for issues
- TypeScript compilation fails → run `bun run typecheck` locally first

### Reset password

```bash
dokku config:set docklight DOCKLIGHT_PASSWORD=new-password
```

This automatically restarts the app.

## Security Recommendations

1. **Always use HTTPS** — Enable Let's Encrypt (Step 5)
2. **Strong password** — Use a long, random password
3. **Restrict access** — Consider putting behind:
   - [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/) (free tier available)
   - [Tailscale](https://tailscale.com/) (VPN-only access)
4. **SSH fallback** — If Docklight crashes, you always have `ssh root@<your-server-ip>` to manage Dokku directly
