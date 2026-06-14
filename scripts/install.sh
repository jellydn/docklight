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
#   ADMIN_SSH_KEY_URL  URL of a public key to grant     (e.g. https://sshid.io/<user>
#                      `git push dokku ...` access      or https://github.com/<user>.keys)
#   ADMIN_SSH_KEY      Inline public key (one line)     (used if ADMIN_SSH_KEY_URL unset)
#   GLOBAL_DOMAIN      Dokku global vhost; all new apps  (default: <ip>.sslip.io)
#                      inherit "<app>.<GLOBAL_DOMAIN>".  Set to "" to keep what
#                      Dokku auto-detected (often the provider's hostname, e.g.
#                      vmi…contaboserver.net).
#   DOKKU_SSH_TARGET   Override the container-to-host SSH bridge target.
#                      If unset, the installer detects a container-reachable
#                      address (Docker bridge gateway, then route fallback).
#                      If the value already includes "user@", it is used as-is;
#                      otherwise "dokku@" is prepended.
#   ENABLE_AUTO_UPDATE      Install a systemd timer to update Docklight (1/0, default: 0)
#   AUTO_UPDATE_SCHEDULE    systemd OnCalendar value (default: daily)
#   AUTO_UPDATE_REPO_URL    Repo used by auto-update (default: REPO_URL)
#   AUTO_UPDATE_BRANCH      Branch used by auto-update (default: BRANCH)
#   AUTO_UPDATE_KEEP_BACKUPS Number of DB backups to keep (default: 5)

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
ADMIN_SSH_KEY_URL="${ADMIN_SSH_KEY_URL:-}"
ADMIN_SSH_KEY="${ADMIN_SSH_KEY:-}"
# GLOBAL_DOMAIN defaults to <ip>.sslip.io after IP detection; honor an explicit
# empty value ("GLOBAL_DOMAIN=") to skip touching the global domain entirely.
GLOBAL_DOMAIN_SET="${GLOBAL_DOMAIN+set}"
GLOBAL_DOMAIN="${GLOBAL_DOMAIN-__AUTO__}"
DOKKU_SSH_TARGET="${DOKKU_SSH_TARGET:-}"
ENABLE_AUTO_UPDATE="${ENABLE_AUTO_UPDATE:-0}"
AUTO_UPDATE_SCHEDULE="${AUTO_UPDATE_SCHEDULE:-daily}"
AUTO_UPDATE_REPO_URL="${AUTO_UPDATE_REPO_URL:-${REPO_URL}}"
AUTO_UPDATE_BRANCH="${AUTO_UPDATE_BRANCH:-${BRANCH}}"
AUTO_UPDATE_KEEP_BACKUPS="${AUTO_UPDATE_KEEP_BACKUPS:-5}"

# ---------- helpers ----------
log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*" >&2; }
err() {
	printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2
	exit 1
}

require_root() {
	if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
		err "This installer must be run as root (try: sudo bash)"
	fi
}

detect_ip() {
	local ip
	# 1. External lookup (most reliable for the publicly-routable address)
	ip="$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || true)"
	# 2. Routable source address (avoids picking an RFC1918 interface)
	if [[ -z "${ip}" ]] && command -v ip >/dev/null 2>&1; then
		ip="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
	fi
	# 3. Last resort
	if [[ -z "${ip}" ]]; then
		ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
	fi
	[[ -n "${ip}" ]] || err "Could not detect server IP"
	printf '%s' "${ip}"
}

detect_container_reachable_host() {
	local host=""

	# 1. Docker bridge gateway (most reliable for container-to-host on standard installs)
	if command -v docker >/dev/null 2>&1; then
		host="$(docker network inspect bridge 2>/dev/null |
			grep -m1 '"Gateway"' |
			sed 's/.*: *"//;s/".*//' ||
			true)"
	fi

	# 2. docker0 interface fallback
	if [[ -z "${host}" ]] && command -v ip >/dev/null 2>&1; then
		host="$(ip -4 addr show docker0 2>/dev/null |
			awk '/inet / {split($2,a,"/"); print a[1]; exit}' ||
			true)"
	fi

	# 3. Last resort: use SERVER_IP (may be unreachable from container on some VPS)
	if [[ -z "${host}" ]]; then
		host="${SERVER_IP}"
		warn "Could not detect container-reachable host; using public IP ${host}"
		warn "If SSH commands hang, set DOKKU_SSH_TARGET to the Docker bridge gateway or host IP"
	fi

	printf '%s' "${host}"
}

sanitize_url() {
	# Redact credentials from URLs for safe logging (e.g. https://user:token@host -> https://[REDACTED]@host)
	printf '%s' "$1" | sed -E 's#(https?://)[^@/]+@#\1[REDACTED]@#'
}

install_auto_update_timer() {
	local app_name="$1"
	local repo_url="$2"
	local branch="$3"
	local keep_backups="$4"
	local schedule="$5"

	if ! command -v systemctl >/dev/null 2>&1; then
		warn "systemctl not found — skipping auto-update timer setup"
		return 0
	fi

	local update_script="/usr/local/bin/${app_name}-update"
	local service_file="/etc/systemd/system/${app_name}-update.service"
	local timer_file="/etc/systemd/system/${app_name}-update.timer"
	local storage_dir="/var/lib/dokku/data/storage/${app_name}"

	log "Installing auto-update timer (${schedule})"

	cat >"${update_script}" <<UPDATER_EOF
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${app_name}"
REPO_URL="${repo_url}"
BRANCH="${branch}"
STORAGE_DIR="${storage_dir}"
BACKUP_DIR="\${STORAGE_DIR}/update-backups"
LOCK_FILE="/var/lock/\${APP_NAME}-update.lock"
KEEP_BACKUPS="${keep_backups}"

exec 9>"\${LOCK_FILE}"
flock -n 9 || { echo "Another \${APP_NAME} update is already running"; exit 0; }

if ! dokku apps:exists "\${APP_NAME}" >/dev/null 2>&1; then
  echo "App \${APP_NAME} does not exist — skipping update"
  exit 0
fi

mkdir -p "\${BACKUP_DIR}"
if [[ -f "\${STORAGE_DIR}/docklight.db" ]]; then
  cp "\${STORAGE_DIR}/docklight.db" "\${BACKUP_DIR}/docklight-\$(date -u +%Y%m%dT%H%M%SZ).db"
  echo "Backed up database to \${BACKUP_DIR}"
fi

dokku git:sync --build "\${APP_NAME}" "\${REPO_URL}" "\${BRANCH}"
echo "Updated \${APP_NAME} from \${REPO_URL} (branch: \${BRANCH})"

# Prune old backups
find "\${BACKUP_DIR}" -name 'docklight-*.db' -type f | sort -r | tail -n +\$((KEEP_BACKUPS + 1)) | xargs -r rm -f
echo "Pruned old backups (keeping \${KEEP_BACKUPS})"
UPDATER_EOF

	chmod 0700 "${update_script}"

	# Warn if repo URL contains credentials (sensitive in generated script)
	if [[ "${repo_url}" =~ ://[^@/]+@ ]]; then
		warn "Auto-update repo URL contains credentials — the generated script at ${update_script} stores them"
		warn "Consider using an SSH deploy key instead of a credentialed HTTPS URL"
	fi

	cat >"${service_file}" <<SERVICE_EOF
[Unit]
Description=Docklight auto-update for ${app_name}
After=network.target dokku.service

[Service]
Type=oneshot
ExecStart=${update_script}
StandardOutput=journal
StandardError=journal
SERVICE_EOF

	cat >"${timer_file}" <<TIMER_EOF
[Unit]
Description=Auto-update timer for ${app_name}

[Timer]
OnCalendar=${schedule}
Persistent=true

[Install]
WantedBy=timers.target
TIMER_EOF

	systemctl daemon-reload
	systemctl enable --now "${app_name}-update.timer"
	log "Auto-update timer enabled: ${app_name}-update.timer (${schedule})"
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
	curl -fsSL -o /tmp/bootstrap.sh "https://dokku.com/install/${DOKKU_VERSION}/bootstrap.sh"
	DOKKU_TAG="${DOKKU_VERSION}" bash /tmp/bootstrap.sh
	rm -f /tmp/bootstrap.sh
else
	log "Dokku already installed: $(dokku version || echo unknown)"
fi

# Make sure the global domain is set so EVERY app created on this server
# (not just docklight) gets a usable default URL like "<app>.<ip>.sslip.io".
# Without this, Dokku falls back to the system hostname — which on most
# VPS providers is a non-routable name like "vmi…contaboserver.net".
if [[ "${GLOBAL_DOMAIN}" == "__AUTO__" ]]; then
	GLOBAL_DOMAIN="${SERVER_IP}.sslip.io"
fi
if [[ -n "${GLOBAL_DOMAIN}" ]]; then
	CURRENT_GLOBAL="$(dokku domains:report --global 2>/dev/null |
		awk -F':' '/Domains global vhosts:/ {sub(/^[[:space:]]+/, "", $2); print $2; exit}' |
		xargs || true)"
	if [[ "${CURRENT_GLOBAL}" != "${GLOBAL_DOMAIN}" ]]; then
		log "Setting Dokku global domain to ${GLOBAL_DOMAIN} (was: ${CURRENT_GLOBAL:-<unset>})"
		dokku domains:set-global "${GLOBAL_DOMAIN}"
	else
		log "Dokku global domain already ${GLOBAL_DOMAIN}"
	fi
elif [[ "${GLOBAL_DOMAIN_SET}" == "set" ]]; then
	log "Skipping global domain (GLOBAL_DOMAIN explicitly empty)"
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
	sudo -u dokku chmod 700 "${DOKKU_HOME}/.ssh"
	sudo -u dokku ssh-keygen -t ed25519 -N "" -f "${KEY_PATH}" -C "docklight@${SERVER_IP}"
	sudo -u dokku sh -c "cat '${KEY_PATH}.pub' >> '${DOKKU_HOME}/.ssh/authorized_keys'"
	sudo -u dokku chmod 600 "${DOKKU_HOME}/.ssh/authorized_keys"
fi

# Note: the container does not need a known_hosts file. The server defaults
# DOCKLIGHT_DOKKU_SSH_OPTS to "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
# (see server/lib/executor.ts), so host key verification is skipped inside the container.

# ---------- 3b. register operator's public key with Dokku (optional) ----------
# Lets you run `git push dokku main`, `ssh dokku@<ip> apps:list`, etc. from
# your laptop without a password.
ADMIN_KEY_REGISTERED=0
ADMIN_KEY_CONTENT=""

if [[ -n "${ADMIN_SSH_KEY_URL}" ]]; then
	log "Fetching admin SSH key from ${ADMIN_SSH_KEY_URL}"
	if ! ADMIN_KEY_CONTENT="$(curl -fsSL --max-time 10 "${ADMIN_SSH_KEY_URL}" 2>/dev/null)"; then
		warn "Could not fetch ${ADMIN_SSH_KEY_URL} — skipping SSH key registration"
		ADMIN_KEY_CONTENT=""
	fi
elif [[ -n "${ADMIN_SSH_KEY}" ]]; then
	ADMIN_KEY_CONTENT="${ADMIN_SSH_KEY}"
fi

if [[ -n "${ADMIN_KEY_CONTENT}" ]]; then
	# Normalize Windows line endings — sshid.io / GitHub keys are LF, but
	# users sometimes paste from editors that inject CRLF.
	ADMIN_KEY_CONTENT="${ADMIN_KEY_CONTENT//$'\r'/}"
	# `dokku ssh-keys:add` reads from stdin and rejects exact duplicates,
	# so loop over each non-empty, non-comment line independently.
	i=0
	admin_key_warned=0
	# Matches the recognized SSH key type token followed by the base64 payload,
	# tolerating authorized_keys entries that prefix options like
	#   from="1.2.3.4" command="…" ssh-ed25519 AAAA…
	# The payload is the first whitespace-separated chunk after the type token.
	KEY_TYPE_RE='(^|[[:space:]])(ssh-(ed25519|rsa|dss)|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)[[:space:]]+([^[:space:]]+)'
	while IFS= read -r line; do
		# Skip blank lines and comments (including those with leading whitespace).
		[[ -z "${line//[[:space:]]/}" || "${line}" =~ ^[[:space:]]*# ]] && continue
		i=$((i + 1))
		key_name="${ADMIN_USERNAME}"
		[[ "${i}" -gt 1 ]] && key_name="${ADMIN_USERNAME}-${i}"
		# Extract the base64 key payload so we can de-dup against authorized_keys
		# without re-calling `dokku ssh-keys:add` on every rerun.
		if [[ "${line}" =~ ${KEY_TYPE_RE} ]]; then
			key_body="${BASH_REMATCH[5]}"
		else
			# Fall back to the 2nd token for malformed-but-maybe-valid lines.
			read -r -a key_parts <<<"${line}"
			key_body="${key_parts[1]:-}"
		fi
		if [[ -n "${key_body}" ]] &&
			sudo -u dokku grep -qF -- "${key_body}" "${DOKKU_HOME}/.ssh/authorized_keys" 2>/dev/null; then
			log "SSH key '${key_name}' already registered with Dokku"
			ADMIN_KEY_REGISTERED=1
		elif printf '%s\n' "${line}" | dokku ssh-keys:add "${key_name}" >/dev/null 2>&1; then
			log "Registered SSH key '${key_name}' with Dokku"
			ADMIN_KEY_REGISTERED=1
		else
			# Real failure (malformed key, name collision under different bytes, …).
			# Warn on the first FAILURE encountered — not just when i==1 — so a
			# later bad key after earlier successes isn't silently dropped.
			if [[ "${admin_key_warned}" -eq 0 ]]; then
				warn "Could not register SSH key '${key_name}'"
				admin_key_warned=1
			fi
		fi
	done <<<"${ADMIN_KEY_CONTENT}"
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

# Determine SSH bridge target: explicit override > existing config > detected host
BRIDGE_TARGET=""
if [[ -n "${DOKKU_SSH_TARGET}" ]]; then
	# Explicit operator override
	if [[ "${DOKKU_SSH_TARGET}" == *"@"* ]]; then
		BRIDGE_TARGET="${DOKKU_SSH_TARGET}"
	else
		BRIDGE_TARGET="dokku@${DOKKU_SSH_TARGET}"
	fi
	log "Using explicit SSH bridge target: ${BRIDGE_TARGET}"
else
	CURRENT_SSH_TARGET="$(get_config DOCKLIGHT_DOKKU_SSH_TARGET)"
	if [[ -n "${CURRENT_SSH_TARGET}" ]]; then
		BRIDGE_TARGET="${CURRENT_SSH_TARGET}"
		log "Preserving existing SSH bridge target: ${BRIDGE_TARGET}"
	else
		REACHABLE_HOST="$(detect_container_reachable_host)"
		BRIDGE_TARGET="dokku@${REACHABLE_HOST}"
		log "Detected container-reachable SSH bridge target: ${BRIDGE_TARGET}"
	fi
fi

log "Setting Dokku SSH bridge config"
dokku config:set --no-restart "${APP_NAME}" \
	DOCKLIGHT_DOKKU_SSH_TARGET="${BRIDGE_TARGET}" \
	DOCKLIGHT_DOKKU_SSH_KEY_PATH=/app/.ssh/id_ed25519 \
	DOCKLIGHT_DB_PATH=/app/data/docklight.db

# ---------- 6. domain ----------
log "Setting domain: ${DOMAIN}"
dokku domains:set "${APP_NAME}" "${DOMAIN}"

# ---------- 7. deploy ----------
log "Deploying ${APP_NAME} from ${REPO_URL} (branch: ${BRANCH})"
dokku git:sync --build "${APP_NAME}" "${REPO_URL}" "${BRANCH}"

# ---------- 7b. (optional) auto-update timer ----------
if [[ "${ENABLE_AUTO_UPDATE}" == "1" ]]; then
	sanitized_url="$(sanitize_url "${AUTO_UPDATE_REPO_URL}")"
	log "Enabling auto-update: repo=${sanitized_url} branch=${AUTO_UPDATE_BRANCH} schedule=${AUTO_UPDATE_SCHEDULE}"
	install_auto_update_timer \
		"${APP_NAME}" \
		"${AUTO_UPDATE_REPO_URL}" \
		"${AUTO_UPDATE_BRANCH}" \
		"${AUTO_UPDATE_KEEP_BACKUPS}" \
		"${AUTO_UPDATE_SCHEDULE}"
fi

# ---------- 8. initial admin user ----------
if [[ -z "${ADMIN_PASSWORD}" ]]; then
	ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
	GENERATED_PW=1
else
	GENERATED_PW=0
fi

log "Creating initial admin user '${ADMIN_USERNAME}'"
# Use `dokku run` (transient container) so we don't depend on the web container
# being up yet, and pass credentials as positional args to avoid shell injection.
if ! dokku run "${APP_NAME}" \
	node server/dist/createUser.js "${ADMIN_USERNAME}" "${ADMIN_PASSWORD}" 2>&1; then
	warn "Could not create admin user automatically — create one with:"
	warn "  dokku run ${APP_NAME} node server/dist/createUser.js admin '<password>'"
	GENERATED_PW=0
fi

# ---------- 9. (optional) HTTPS ----------
HTTPS_ENABLED=0
if [[ "${ENABLE_HTTPS}" == "1" ]]; then
	if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
		warn "ENABLE_HTTPS=1 but LETSENCRYPT_EMAIL is not set — skipping SSL"
	else
		log "Installing dokku-letsencrypt plugin (if missing)"
		if ! dokku plugin:list | grep -q letsencrypt; then
			dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git ||
				warn "Could not install dokku-letsencrypt plugin"
		fi
		if dokku plugin:list | grep -q letsencrypt; then
			dokku letsencrypt:set "${APP_NAME}" email "${LETSENCRYPT_EMAIL}" ||
				warn "Could not configure Let's Encrypt email"
			log "Enabling HTTPS via Let's Encrypt"
			if dokku letsencrypt:enable "${APP_NAME}"; then
				HTTPS_ENABLED=1
				dokku letsencrypt:cron-job --add || true
			else
				warn "Let's Encrypt failed — make sure DNS for ${DOMAIN} points to ${SERVER_IP}"
			fi
		fi
	fi
fi

# ---------- done ----------
URL_SCHEME="http"
[[ "${HTTPS_ENABLED}" == "1" ]] && URL_SCHEME="https"

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

if [[ "${ADMIN_KEY_REGISTERED}" == "1" ]]; then
	cat <<EOF
  SSH access (no password needed):
    ssh dokku@${SERVER_IP}                 # → Dokku command shell
    git remote add dokku dokku@${SERVER_IP}:${APP_NAME}
    git push dokku main                    # deploy from your laptop

EOF
else
	cat <<EOF
  ⚠️  No operator SSH key registered with Dokku yet.
      \`ssh dokku@${SERVER_IP}\` will currently prompt for a password (no auth).

      Pick ONE of the following, from your LAPTOP:

      a) sshid.io / GitHub keys (recommended):
         curl -fsSL https://sshid.io/<your-handle> | \\
           ssh root@${SERVER_IP} "sudo -u dokku dokku ssh-keys:add admin"
         # works with https://github.com/<user>.keys too

      b) From your local public key file:
         cat ~/.ssh/id_ed25519.pub | \\
           ssh root@${SERVER_IP} "sudo -u dokku dokku ssh-keys:add admin"

      Or re-run the installer with: ADMIN_SSH_KEY_URL=https://sshid.io/<handle>

EOF
fi

cat <<EOF
  Useful commands (run on the server):
    dokku logs ${APP_NAME} -t              # tail logs
    dokku ps:restart ${APP_NAME}           # restart
    dokku enter ${APP_NAME} web sh         # shell into container

  Reset password:
    dokku run ${APP_NAME} \\
      node server/dist/createUser.js ${ADMIN_USERNAME} '<new-password>'

EOF

if [[ "${ENABLE_HTTPS}" != "1" ]]; then
	cat <<EOF
  To enable HTTPS later:
    dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
    dokku letsencrypt:set ${APP_NAME} email you@example.com
    dokku letsencrypt:enable ${APP_NAME}

EOF
fi
