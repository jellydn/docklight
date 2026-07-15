#!/usr/bin/env bash
#
# Repair HTTPS for a Dokku app (domain + Let's Encrypt).
# Run on the Dokku server as root.
#
# Usage:
#   sudo APP_NAME=docklight DOMAIN=docklight.itman.fyi LETSENCRYPT_EMAIL=you@example.com bash scripts/repair-ssl.sh
#
# Or from the repo on the server:
#   curl -fsSL .../repair-ssl.sh | sudo APP_NAME=docklight DOMAIN=docklight.itman.fyi LETSENCRYPT_EMAIL=you@example.com bash
#
# Environment:
#   APP_NAME           Dokku app (default: docklight)
#   DOMAIN             FQDN that must appear on the certificate (required)
#   LETSENCRYPT_EMAIL  ACME account email (required)
#   FIX_PROXY_PORT     If 1, remap http host port to 80 when not already on 80 (default: 0)

set -euo pipefail

APP_NAME="${APP_NAME:-docklight}"
DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
FIX_PROXY_PORT="${FIX_PROXY_PORT:-0}"

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*" >&2; }
err() {
	printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2
	exit 1
}

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
	err "Run as root (sudo bash)"
fi

if [[ -z "${DOMAIN}" ]]; then
	err "DOMAIN is required (e.g. DOMAIN=docklight.itman.fyi)"
fi
if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
	err "LETSENCRYPT_EMAIL is required for Let's Encrypt"
fi

if ! dokku apps:exists "${APP_NAME}" 2>/dev/null; then
	err "App '${APP_NAME}' does not exist"
fi

log "Domains for ${APP_NAME} (before):"
dokku domains:report "${APP_NAME}" || true

log "Setting app domain to ${DOMAIN}"
dokku domains:set "${APP_NAME}" "${DOMAIN}"

if [[ "${FIX_PROXY_PORT}" == "1" ]]; then
	log "Checking proxy port mapping"
	mapfile -t port_lines < <(dokku proxy:ports "${APP_NAME}" 2>/dev/null | awk 'NR>1 && $1=="http" {print $2,$3}')
	if [[ ${#port_lines[@]} -eq 1 ]]; then
		read -r host_port container_port <<<"${port_lines[0]}"
		if [[ "${host_port}" != "80" && -n "${container_port}" ]]; then
			log "Remapping http:${host_port}:${container_port} -> http:80:${container_port}"
			dokku proxy:ports-remove "${APP_NAME}" "http:${host_port}:${container_port}"
			dokku proxy:ports-add "${APP_NAME}" "http:80:${container_port}"
		fi
	fi
fi

if ! dokku plugin:list 2>/dev/null | grep -q letsencrypt; then
	log "Installing dokku-letsencrypt plugin"
	dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
fi

log "Configuring Let's Encrypt email"
dokku letsencrypt:set "${APP_NAME}" email "${LETSENCRYPT_EMAIL}"

log "Enabling / renewing certificate for ${DOMAIN}"
if ! dokku letsencrypt:enable "${APP_NAME}"; then
	warn "letsencrypt:enable failed — try: dokku letsencrypt:renew ${APP_NAME}"
	warn "Ensure DNS: dig +short ${DOMAIN} matches this server's public IP"
	warn "Ensure inbound TCP 80 and 443 are open"
	exit 1
fi

dokku letsencrypt:cron-job --add 2>/dev/null || true

log "Certificate check (openssl SNI=${DOMAIN}):"
echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null \
	| openssl x509 -noout -subject -dates 2>/dev/null || warn "Could not read certificate from ${DOMAIN}:443"

log "Done. Test: curl -fsSI https://${DOMAIN}/ | head -5"