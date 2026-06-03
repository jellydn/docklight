#!/usr/bin/env bash
#
# Docklight one-line installer
#
# Installs Dokku (if missing) and deploys Docklight on a fresh Ubuntu/Debian VPS.
#
# Usage (run as root on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh | sudo bash
#
# With options:
#   curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/install.sh \
#     | sudo DOMAIN=docklight.example.com bash
#
# Environment variables (all optional):
#   APP_NAME       Dokku app name                       (default: docklight)
#   DOMAIN         Custom domain for the app            (default: <ip>.sslip.io)
#   REPO_URL       Git repo to deploy                   (default: https://github.com/jellydn/docklight.git)
#   BRANCH         Branch to deploy                     (default: main)
#   DOKKU_VERSION  Dokku version to install             (default: v0.35.20)
#   ENABLE_HTTPS   Run letsencrypt after deploy (1/0)   (default: 0; requires DOMAIN)
#   LETSENCRYPT_EMAIL  Email for Let's Encrypt          (required if ENABLE_HTTPS=1)
#   ADMIN_USERNAME Initial admin username               (default: admin)
#   ADMIN_PASSWORD Initial admin password               (default: auto-generated)

set -euo pipefail

APP_NAME="${APP_NAME:-docklight}"
DOMAIN="${DOMAIN:-}"
REPO_URL="${REPO_URL:-https://github.com/jellydn/docklight.git}"
BRANCH="${BRANCH:-main}"
DOKKU_VERSION="${DOKKU_VERSION:-v0.35.20}"
ENABLE_HTTPS="${ENABLE_HTTPS:-0}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# ---------- helpers ----------
log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*" >&2; }
err()  { printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2; exit 1; }

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    err "This installer must be run as root (try: sudo bash)"
  fi
}

detect_ip() {
  local ip
  ip="$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  if [[ -z "${ip}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  [[ -n "${ip}" ]] || err "Could not detect server IP"
  printf '%s' "${ip}"
}

# ---------- preflight ----------
require_root

if ! command -v curl >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1; then
  log "Installing base packages (curl, openssl, ca-certificates)..."
  apt-get update -y
  apt-get install -y curl openssl ca-certificates
fi

SERVER_IP="$(detect_ip)"
log "Detected server IP: ${SERVER_IP}"

# Default domain: <ip>.sslip.io (works with no DNS setup)
if [[ -z "${DOMAIN}" ]]; then
  DOMAIN="${APP_NAME}.${SERVER_IP}.sslip.io"
  log "No DOMAIN provided — using ${DOMAIN}"
fi

# ---------- 1. install Dokku ----------
if ! command -v dokku >/dev/null 2>&1; then
  log "Installing Dokku ${DOKKU_VERSION} (this can take a few minutes)..."
  wget -qO /tmp/bootstrap.sh "https://dokku.com/install/${DOKKU_VERSION}/bootstrap.sh"
  DOKKU_TAG="${DOKKU_VERSION}" bash /tmp/bootstrap.sh
  rm -f /tmp/bootstrap.sh
else
  log "Dokku already installed: $(dokku version || echo unknown)"
fi

# Make sure the global domain is set so Dokku generates nice URLs
if ! dokku domains:report --global 2>/dev/null | grep -q "Domains global vhosts:.*[a-z0-9]"; then
  log "Setting Dokku global domain to ${SERVER_IP}.sslip.io"
  dokku domains:set-global "${SERVER_IP}.sslip.io"
fi

# ---------- 2. create app ----------
if dokku apps:exists "${APP_NAME}" >/dev/null 2>&1; then
  log "App '${APP_NAME}' already exists — reusing"
else
  log "Creating Dokku app '${APP_NAME}'"
  dokku apps:create "${APP_NAME}"
fi

# ---------- 3. SSH key for container -> host Dokku CLI ----------
DOKKU_HOME="/home/dokku"
KEY_PATH="${DOKKU_HOME}/.ssh/docklight"

if [[ ! -f "${KEY_PATH}" ]]; then
  log "Generating dedicated SSH key for Docklight (${KEY_PATH})"
  sudo -u dokku mkdir -p "${DOKKU_HOME}/.ssh"
  sudo -u dokku ssh-keygen -t ed25519 -N "" -f "${KEY_PATH}" -C "docklight@${SERVER_IP}"
  sudo -u dokku sh -c "cat '${KEY_PATH}.pub' >> '${DOKKU_HOME}/.ssh/authorized_keys'"
  sudo -u dokku chmod 600 "${DOKKU_HOME}/.ssh/authorized_keys"
fi

# Pre-populate known_hosts so the container won't fail on first SSH
sudo -u dokku touch "${DOKKU_HOME}/.ssh/known_hosts"
if ! sudo -u dokku grep -q "${SERVER_IP}" "${DOKKU_HOME}/.ssh/known_hosts" 2>/dev/null; then
  log "Adding ${SERVER_IP} to dokku user known_hosts"
  ssh-keyscan -H "${SERVER_IP}" 2>/dev/null | sudo -u dokku tee -a "${DOKKU_HOME}/.ssh/known_hosts" >/dev/null
fi

# ---------- 4. persistent storage ----------
STORAGE_DIR="/var/lib/dokku/data/storage/${APP_NAME}"
mkdir -p "${STORAGE_DIR}"
chown -R 32767:32767 "${STORAGE_DIR}" 2>/dev/null || chown -R dokku:dokku "${STORAGE_DIR}"

storage_mounted() { dokku storage:list "${APP_NAME}" 2>/dev/null | grep -Fq "$1"; }

if ! storage_mounted ":/app/data"; then
  log "Mounting persistent data volume"
  dokku storage:mount "${APP_NAME}" "${STORAGE_DIR}:/app/data"
fi

if ! storage_mounted ":/app/.ssh/id_ed25519"; then
  log "Mounting SSH key into container"
  dokku storage:mount "${APP_NAME}" "${KEY_PATH}:/app/.ssh/id_ed25519"
fi

# ---------- 5. config ----------
get_config() { dokku config:get "${APP_NAME}" "$1" 2>/dev/null || true; }

if [[ -z "$(get_config JWT_SECRET)" ]]; then
  log "Generating JWT_SECRET"
  dokku config:set --no-restart "${APP_NAME}" JWT_SECRET="$(openssl rand -base64 48)"
fi

log "Setting Dokku SSH bridge config"
dokku config:set --no-restart "${APP_NAME}" \
  DOCKLIGHT_DOKKU_SSH_TARGET="dokku@${SERVER_IP}" \
  DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519 \
  DOCKLIGHT_DB_PATH=/app/data/docklight.db

# ---------- 6. domain ----------
log "Setting domain: ${DOMAIN}"
dokku domains:set "${APP_NAME}" "${DOMAIN}"

# ---------- 7. deploy ----------
log "Deploying ${APP_NAME} from ${REPO_URL} (branch: ${BRANCH})"
dokku git:sync --build "${APP_NAME}" "${REPO_URL}" "${BRANCH}"

# ---------- 8. initial admin user ----------
if [[ -z "${ADMIN_PASSWORD}" ]]; then
  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  GENERATED_PW=1
else
  GENERATED_PW=0
fi

log "Creating initial admin user '${ADMIN_USERNAME}'"
if ! dokku enter "${APP_NAME}" web sh -c \
      "node server/dist/createUser.js '${ADMIN_USERNAME}' '${ADMIN_PASSWORD}'" 2>&1; then
  warn "Could not create admin user automatically — create one with:"
  warn "  dokku enter ${APP_NAME} web sh -c 'node server/dist/createUser.js admin <password>'"
  GENERATED_PW=0
fi

# ---------- 9. (optional) HTTPS ----------
if [[ "${ENABLE_HTTPS}" == "1" ]]; then
  if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
    warn "ENABLE_HTTPS=1 but LETSENCRYPT_EMAIL is not set — skipping SSL"
  else
    log "Installing dokku-letsencrypt plugin (if missing)"
    if ! dokku plugin:list | grep -q letsencrypt; then
      dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
    fi
    dokku letsencrypt:set "${APP_NAME}" email "${LETSENCRYPT_EMAIL}"
    log "Enabling HTTPS via Let's Encrypt"
    dokku letsencrypt:enable "${APP_NAME}" || warn "Let's Encrypt failed — make sure DNS points to ${SERVER_IP}"
    dokku letsencrypt:cron-job --add || true
  fi
fi

# ---------- done ----------
URL_SCHEME="http"
[[ "${ENABLE_HTTPS}" == "1" ]] && URL_SCHEME="https"

cat <<EOF

============================================================
  ✅ Docklight is installed!
============================================================

  URL:        ${URL_SCHEME}://${DOMAIN}
  App name:   ${APP_NAME}
  Server IP:  ${SERVER_IP}

EOF

if [[ "${GENERATED_PW:-0}" == "1" ]]; then
  cat <<EOF
  Login:
    username: ${ADMIN_USERNAME}
    password: ${ADMIN_PASSWORD}

  >>> SAVE THIS PASSWORD — it is shown only once. <<<

EOF
else
  echo "  Login with the admin credentials you provided."
  echo
fi

cat <<EOF
  Useful commands (run on the server):
    dokku logs ${APP_NAME} -t              # tail logs
    dokku ps:restart ${APP_NAME}           # restart
    dokku enter ${APP_NAME} web sh         # shell into container

  Reset password:
    dokku enter ${APP_NAME} web sh -c \\
      "node server/dist/createUser.js ${ADMIN_USERNAME} <new-password>"

EOF

if [[ "${ENABLE_HTTPS}" != "1" ]]; then
  cat <<EOF
  To enable HTTPS later:
    dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
    dokku letsencrypt:set ${APP_NAME} email you@example.com
    dokku letsencrypt:enable ${APP_NAME}

EOF
fi
