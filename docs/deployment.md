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
