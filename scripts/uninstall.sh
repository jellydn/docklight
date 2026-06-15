#!/usr/bin/env bash
#
# Docklight one-line uninstaller
#
# Completely removes Docklight, Dokku, and all associated data from a VPS.
#
# Usage (run as root on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/jellydn/docklight/main/scripts/uninstall.sh | sudo bash
#
# Environment variables (all optional):
#   APP_NAME        Dokku app name to destroy            (default: docklight)
#   REMOVE_DOCKER   Also purge Docker (1/0)              (default: 0)
#   CONFIRM         Skip interactive confirmation (1/0)   (default: 0)
#
# WARNING: This script is DESTRUCTIVE. It will remove ALL Dokku data including
#          apps, databases, SSL certs, and configs. Use with extreme care.

set -euo pipefail

APP_NAME="${APP_NAME:-docklight}"
REMOVE_DOCKER="${REMOVE_DOCKER:-0}"
CONFIRM="${CONFIRM:-0}"

# ---------- helpers ----------
log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*" >&2; }
err() {
	printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2
	exit 1
}

require_root() {
	if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
		err "This uninstaller must be run as root (try: sudo bash)"
	fi
}

# ---------- preflight ----------
require_root

if [[ "${CONFIRM}" != "1" ]]; then
	cat <<WARN

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  DESTRUCTIVE OPERATION — This will remove everything:
    - Dokku, all apps, databases, SSL certs
    - Docker containers, images, volumes${REMOVE_DOCKER:+ (Docker will also be purged)}
    - /home/dokku, /var/lib/dokku, /var/log/dokku
  Type "yes" to continue or Ctrl+C to abort.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

WARN
	read -r -p "Continue? [yes/NO]: " REPLY
	if [[ "${REPLY}" != "yes" ]]; then
		log "Aborted."
		exit 0
	fi
fi

# ---------- 1. Stop Docklight app ----------
if command -v dokku >/dev/null 2>&1; then
	if dokku apps:exists "${APP_NAME}" >/dev/null 2>&1; then
		log "Stopping app '${APP_NAME}'..."
		dokku ps:stop "${APP_NAME}" 2>/dev/null || true
	fi
fi

# ---------- 2. Remove auto-update timer (if installed) ----------
log "Removing auto-update timer (if any)..."
systemctl stop "${APP_NAME}-update.timer" 2>/dev/null || true
systemctl disable "${APP_NAME}-update.timer" 2>/dev/null || true
rm -f "/etc/systemd/system/${APP_NAME}-update.service"
rm -f "/etc/systemd/system/${APP_NAME}-update.timer"
rm -f "/usr/local/bin/${APP_NAME}-update"
systemctl daemon-reload 2>/dev/null || true

# ---------- 3. Destroy the Docklight Dokku app ----------
if command -v dokku >/dev/null 2>&1; then
	if dokku apps:exists "${APP_NAME}" >/dev/null 2>&1; then
		log "Destroying app '${APP_NAME}'..."
		dokku apps:destroy "${APP_NAME}" --force 2>/dev/null || dokku apps:destroy "${APP_NAME}" 2>/dev/null || true
	fi

	# ---------- 4. Dokku cleanup (remove dangling containers/images) ----------
	log "Running Dokku cleanup..."
	dokku cleanup 2>/dev/null || true
fi

# ---------- 5. Uninstall Dokku & herokuish packages ----------
log "Purging dokku and herokuish packages..."
apt-get purge -y dokku herokuish 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

# ---------- 6. Optionally remove Docker ----------
if [[ "${REMOVE_DOCKER}" == "1" ]]; then
	log "Removing Docker..."
	apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
	rm -rf /var/lib/docker
fi

# ---------- 7. Remove Dokku data directories ----------
log "Removing Dokku data directories..."
rm -rf /home/dokku
rm -rf /var/lib/dokku
rm -rf /var/log/dokku

# ---------- 8. Remove dokku user and group ----------
log "Removing dokku user and group..."
deluser dokku 2>/dev/null || true
delgroup dokku 2>/dev/null || true

# ---------- 9. Remove any remaining docklight-specific Docker artifacts ----------
log "Removing any remaining Docker artifacts for '${APP_NAME}'..."
if command -v docker >/dev/null 2>&1; then
	docker ps -a -q --filter "name=${APP_NAME}" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	docker volume ls -q --filter "name=${APP_NAME}" 2>/dev/null | xargs -r docker volume rm -f 2>/dev/null || true
fi

# ---------- done ----------
DOCKER_MSG="preserved"
[[ "${REMOVE_DOCKER}" == "1" ]] && DOCKER_MSG="purged"

cat <<EOF

============================================================
  ✅ Uninstall complete
============================================================

  Removed:
    - App:         ${APP_NAME}
    - Dokku:       purged (packages + all data)
    - Auto-update: timer removed
    - Docker:      ${DOCKER_MSG}

  To reinstall, visit:
    https://github.com/jellydn/docklight

EOF
