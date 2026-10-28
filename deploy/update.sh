#!/bin/bash
# Spieleschrank: neueste freigegebene Version holen und einspielen.
#
# Läuft jede Nacht über den systemd-Timer und einmal bei der Ersteinrichtung.
# Freigegeben ist, was auf dem Zweig `release` liegt. Die Versionsnummer steht in
# app/VERSION; eingespielt wird nur eine höhere Nummer als die laufende.
#
# Ablauf: neue Version vorbereiten → Dienst stoppen → Datenbank sichern → umschalten
#         → starten → prüfen. Startet die neue Version nicht sauber, wird die Sicherung
#         zurückgespielt und die bisherige Version wieder gestartet. Diese Version wird
#         danach nicht noch einmal versucht (bis eine neuere kommt).
#
# Aufruf: spieleschrank-update [--force]
set -euo pipefail
umask 022

BASE=${BASE:-/opt/spieleschrank}
ENV_FILE=${ENV_FILE:-/etc/spieleschrank/env}
SYSTEMCTL=${SYSTEMCTL:-systemctl}
RUN_AS=${RUN_AS:-spieleschrank}
SERVICE=spieleschrank
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1

log() { echo "[spieleschrank-update] $*"; }
# Werte aus der Einrichtungsdatei wörtlich lesen (nichts wird als Shell-Code ausgewertet)
conf() { tr -d '\r' < "$ENV_FILE" 2>/dev/null | grep -E "^$1=" | tail -1 | cut -d= -f2- || true; }

DOMAIN=$(conf DOMAIN)
REPO_URL=$(conf REPO_URL); REPO_URL=${REPO_URL:-https://github.com/JakobLonauer/spieleschrank.git}

mkdir -p "$BASE/bin" "$BASE/releases" "$BASE/update-backups" "$BASE/data"
exec 9>"$BASE/.update.lock"
flock -n 9 || { log "Ein Update läuft schon."; exit 0; }

# ---------- 1. Welche Version ist freigegeben? ----------
BRANCH=$(conf RELEASE_BRANCH); BRANCH=${BRANCH:-release}
if [ ! -d "$BASE/src/.git" ]; then git clone -q "$REPO_URL" "$BASE/src"; fi
git -C "$BASE/src" fetch -q --force --prune origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
REV=$(git -C "$BASE/src" rev-parse "origin/$BRANCH")
VER=$(git -C "$BASE/src" show "$REV:app/VERSION" 2>/dev/null | tr -d '[:space:]' || true)
echo "$VER" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { log "Keine gültige Versionsnummer in app/VERSION auf $BRANCH."; exit 0; }
TAG="v$VER"

CUR=""; [ -L "$BASE/current" ] && CUR=$(basename "$(readlink -f "$BASE/current")")
if [ $FORCE = 0 ]; then
  [ "$TAG" = "$CUR" ] && { log "Aktuell: $CUR"; exit 0; }
  [ "$TAG" = "$(cat "$BASE/.failed-tag" 2>/dev/null || true)" ] && { log "$TAG ist schon einmal gescheitert, bleibe bei $CUR."; exit 0; }
  if [ -n "$CUR" ] && [ "$(printf '%s\n%s\n' "$CUR" "$TAG" | sort -V | tail -1)" != "$TAG" ]; then log "Keine neuere Version (läuft: $CUR, freigegeben: $TAG)."; exit 0; fi
fi
log "Spiele $TAG ein (bisher: ${CUR:-nichts}, Stand ${REV:0:7})."

# ---------- 2. Neue Version vorbereiten, solange die alte noch läuft ----------
REL="$BASE/releases/$TAG"
if [ ! -d "$REL" ] || [ $FORCE = 1 ]; then
  rm -rf "$REL.tmp"; mkdir -p "$REL.tmp"
  git -C "$BASE/src" archive "$REV" app deploy | tar -x -C "$REL.tmp"
  echo "$REV" > "$REL.tmp/REVISION"
  rm -rf "$REL"; mv "$REL.tmp" "$REL"
fi

PBV=$(tr -d '[:space:]' < "$REL/deploy/POCKETBASE_VERSION")
case "$(uname -m)" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) log "Unbekannte Prozessorart: $(uname -m)"; exit 1 ;;
esac
PB="$BASE/bin/pocketbase-$PBV"
if [ ! -x "$PB" ]; then
  ZIP="pocketbase_${PBV}_linux_${ARCH}.zip"
  SUM=$(awk -v f="$ZIP" '$2 == f { print $1 }' "$REL/deploy/pocketbase.sha256")
  [ -n "$SUM" ] || { log "Keine Prüfsumme für $ZIP hinterlegt."; exit 1; }
  TMP=$(mktemp -d)
  curl -fsSL --retry 3 -o "$TMP/$ZIP" "https://github.com/pocketbase/pocketbase/releases/download/v$PBV/$ZIP"
  if ! echo "$SUM  $TMP/$ZIP" | sha256sum -c --quiet -; then log "Prüfsumme von PocketBase stimmt nicht, breche ab."; rm -rf "$TMP"; exit 1; fi
  unzip -q -o "$TMP/$ZIP" pocketbase -d "$TMP"
  install -m 0755 "$TMP/pocketbase" "$PB.new"; mv -f "$PB.new" "$PB"
  rm -rf "$TMP"
fi

# PocketBase als Dienstkonto aufrufen, mit genau den Werten aus der Einrichtungsdatei
mapfile -t ENVS < <(tr -d '\r' < "$ENV_FILE" | grep -E '^[A-Z_][A-Z0-9_]*=' || true)
run_pb() {
  runuser -u "$RUN_AS" -- env -i PATH=/usr/bin:/bin HOME="$BASE" TZ=Europe/Vienna "${ENVS[@]}" \
    "$BASE/bin/pocketbase" "$@" --dir="$BASE/data" \
    --hooksDir="$BASE/current/app/pb_hooks" --migrationsDir="$BASE/current/app/pb_migrations"
}

healthy() {
  local code
  for _ in $(seq 1 30); do
    sleep 2
    if [ -n "${HEALTH_URL:-}" ]; then
      curl -fsS -m 5 "$HEALTH_URL" >/dev/null 2>&1 && return 0
      continue
    fi
    curl -fsS -m 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health" >/dev/null 2>&1 && return 0
    # Noch kein Zertifikat, weil die Domain noch nicht hierher zeigt: dann genügt,
    # dass der Server antwortet und nach ein paar Sekunden immer noch läuft.
    if [ ! -f "$BASE/data/.autocert_cache/$DOMAIN" ]; then
      code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1/api/health || true)
      if [ "$code" = "302" ]; then sleep 6; $SYSTEMCTL is-active --quiet $SERVICE && return 0; fi
    fi
  done
  return 1
}

install_units() {
  [ "$SYSTEMCTL" = "systemctl" ] || return 0
  local changed=0 f
  for f in spieleschrank.service spieleschrank-update.service spieleschrank-update.timer; do
    if ! cmp -s "$REL/deploy/$f" "/etc/systemd/system/$f"; then install -m 0644 "$REL/deploy/$f" "/etc/systemd/system/$f"; changed=1; fi
  done
  [ $changed = 1 ] && systemctl daemon-reload
  install -m 0755 "$REL/deploy/update.sh" /usr/local/sbin/spieleschrank-update
}

# ---------- 3. Umschalten ----------
FIRST=0; [ -f "$BASE/data/data.db" ] || FIRST=1
OLD_PB=$(readlink -f "$BASE/bin/pocketbase" 2>/dev/null || true)
BK="$BASE/update-backups/$(date +%Y%m%d-%H%M%S)-${CUR:-neu}"

$SYSTEMCTL stop $SERVICE 2>/dev/null || true
if [ $FIRST = 0 ]; then
  mkdir -p "$BK"
  cp -a "$BASE"/data/*.db* "$BK"/
  log "Datenbank gesichert: $BK"
fi
ln -sfn "$REL" "$BASE/current.new"; mv -Tf "$BASE/current.new" "$BASE/current"
ln -sfn "$PB" "$BASE/bin/pocketbase.new"; mv -Tf "$BASE/bin/pocketbase.new" "$BASE/bin/pocketbase"
install_units

if [ $FIRST = 1 ]; then
  # Erster Start: Datenbank anlegen (dabei entstehen Einstellungen und Jakobs Konto)
  # und das Notfall-Konto für die PocketBase-Verwaltung unter /_/
  EMAIL=$(conf EMAIL); PASS=$(conf SPIELESCHRANK_ADMIN_PASSWORD)
  chown "$RUN_AS": "$BASE/data"; chmod 750 "$BASE/data"
  if [ -n "$EMAIL" ] && [ -n "$PASS" ]; then run_pb superuser upsert "$EMAIL" "$PASS" >/dev/null; else run_pb migrate up >/dev/null; fi
fi

$SYSTEMCTL start $SERVICE 9>&-
if healthy; then
  rm -f "$BASE/.failed-tag"
  log "$TAG läuft."
  if [ $FIRST = 1 ] && [ "$ENV_FILE" = "/etc/spieleschrank/env" ]; then
    # Das Startpasswort steckt jetzt in der Datenbank und muss nicht länger in der Datei stehen
    sed -i '/^SPIELESCHRANK_ADMIN_PASSWORD=/d' "$ENV_FILE"
  fi
else
  log "$TAG startet nicht sauber."
  echo "$TAG" > "$BASE/.failed-tag"
  if [ $FIRST = 0 ] && [ -n "$CUR" ]; then
    log "Zurück auf $CUR."
    $SYSTEMCTL stop $SERVICE 2>/dev/null || true
    rm -f "$BASE"/data/*.db*
    cp -a "$BK"/*.db* "$BASE/data/"
    ln -sfn "$BASE/releases/$CUR" "$BASE/current.new"; mv -Tf "$BASE/current.new" "$BASE/current"
    [ -n "$OLD_PB" ] && { ln -sfn "$OLD_PB" "$BASE/bin/pocketbase.new"; mv -Tf "$BASE/bin/pocketbase.new" "$BASE/bin/pocketbase"; }
    REL="$BASE/releases/$CUR"; install_units
    $SYSTEMCTL start $SERVICE 9>&-
  fi
  exit 1
fi

# ---------- 4. Aufräumen: die letzten Versionen und Sicherungen bleiben ----------
keep_newest() { # Ordner, Anzahl
  local dir=$1 n=$2
  ls -1 "$dir" 2>/dev/null | sort -V | head -n -"$n" | while read -r d; do
    [ "$dir/$d" = "$(readlink -f "$BASE/current")" ] || rm -rf "${dir:?}/$d"
  done
}
keep_newest "$BASE/releases" 3
keep_newest "$BASE/update-backups" 5
for f in "$BASE"/bin/pocketbase-*; do
  [ "$f" = "$(readlink -f "$BASE/bin/pocketbase")" ] || [ "$f" = "$OLD_PB" ] || rm -f "$f"
done
exit 0
