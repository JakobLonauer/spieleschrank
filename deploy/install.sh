#!/bin/bash
# Spieleschrank: Server einrichten (Ubuntu 24.04 bei Hetzner).
#
# Wird beim allerersten Start des Servers über die Cloud-Config aufgerufen und
# richtet alles ein: Zeitzone, automatische Sicherheitsupdates, Firewall,
# Dienstkonto, die App selbst (mit HTTPS-Zertifikat über Let's Encrypt) und das
# nächtliche Update. Darf gefahrlos noch einmal laufen.
#
# Erwartet /etc/spieleschrank/env mit mindestens DOMAIN, EMAIL und
# SPIELESCHRANK_ADMIN_PASSWORD (siehe cloud-config.yaml).
set -euo pipefail
umask 022

ENV_FILE=/etc/spieleschrank/env
BASE=/opt/spieleschrank
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log() { echo "[spieleschrank-install] $*"; }
die() { log "FEHLER: $*"; exit 1; }
conf() { tr -d '\r' < "$ENV_FILE" 2>/dev/null | grep -E "^$1=" | tail -1 | cut -d= -f2- || true; }

[ "$(id -u)" = 0 ] || die "Bitte als root ausführen."
[ -f "$ENV_FILE" ] || die "$ENV_FILE fehlt."
chmod 600 "$ENV_FILE"; chown root:root "$ENV_FILE"

DOMAIN=$(conf DOMAIN); EMAIL=$(conf EMAIL); PASS=$(conf SPIELESCHRANK_ADMIN_PASSWORD)
echo "$DOMAIN" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' || die "DOMAIN sieht nicht wie eine Domain aus: '$DOMAIN' (nur Kleinbuchstaben, ohne https://)."
if [ ! -f "$BASE/data/data.db" ]; then
  echo "$EMAIL" | grep -Eq '^[^@ ]+@[^@ ]+\.[^@ ]+$' || die "EMAIL fehlt oder ist ungültig."
  [ "${#PASS}" -ge 10 ] || die "SPIELESCHRANK_ADMIN_PASSWORD muss mindestens 10 Zeichen haben."
fi

# ---------- System ----------
log "System vorbereiten"
timedatectl set-timezone Europe/Vienna 2>/dev/null || ln -sf /usr/share/zoneinfo/Europe/Vienna /etc/localtime
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q git curl unzip ca-certificates ufw unattended-upgrades

# Sicherheitsupdates automatisch einspielen, bei Bedarf nachts neu starten
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/52spieleschrank <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "05:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

# Firewall: nur Web (80/443) und, gebremst, SSH für Notfälle
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw limit 22/tcp >/dev/null
ufw --force enable >/dev/null

# SSH nur mit Schlüssel, nie mit Passwort
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/50-spieleschrank.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true

# Protokolle begrenzen
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=300M\n' > /etc/systemd/journald.conf.d/50-spieleschrank.conf
systemctl restart systemd-journald 2>/dev/null || true

# ---------- Dienstkonto und Ordner ----------
id spieleschrank >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --no-create-home --shell /usr/sbin/nologin spieleschrank
mkdir -p "$BASE/bin" "$BASE/releases" "$BASE/update-backups" "$BASE/data"
chown spieleschrank:spieleschrank "$BASE/data"; chmod 750 "$BASE/data"
chmod 700 "$BASE/update-backups"
REPO_URL=$(conf REPO_URL); REPO_URL=${REPO_URL:-https://github.com/JakobLonauer/spieleschrank.git}
[ -d "$BASE/src/.git" ] || git clone -q "$REPO_URL" "$BASE/src"

# ---------- Dienste ----------
install -m 0644 "$SRC/deploy/spieleschrank.service" /etc/systemd/system/spieleschrank.service
install -m 0644 "$SRC/deploy/spieleschrank-update.service" /etc/systemd/system/spieleschrank-update.service
install -m 0644 "$SRC/deploy/spieleschrank-update.timer" /etc/systemd/system/spieleschrank-update.timer
install -m 0755 "$SRC/deploy/update.sh" /usr/local/sbin/spieleschrank-update
systemctl daemon-reload
systemctl enable spieleschrank.service >/dev/null 2>&1

# ---------- App einspielen und starten ----------
log "App einspielen"
/usr/local/sbin/spieleschrank-update --force
systemctl enable --now spieleschrank-update.timer >/dev/null 2>&1

log "Fertig. Sobald die Domain auf diesen Server zeigt: https://$DOMAIN"
