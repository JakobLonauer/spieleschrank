# Server: Einrichtung und Updates

Ziel: Jakob braucht kein Terminal. Er legt bei Hetzner einen Server an und fügt `cloud-config.yaml` mit drei angepassten Werten ein. Alles andere läuft von selbst.

## Was beim ersten Start passiert

1. cloud-init schreibt `/etc/spieleschrank/env` (nur root), installiert git und curl, klont dieses Repository nach `/opt/spieleschrank/src` und startet `install.sh`.
2. `install.sh`: Zeitzone Wien, automatische Sicherheitsupdates (Neustart bei Bedarf um 5 Uhr), Firewall (80, 443, SSH gebremst), SSH nur mit Schlüssel, Dienstkonto `spieleschrank`, systemd-Dienste, dann `update.sh --force`.
3. `update.sh`: Stand des Zweigs `release` → `releases/v<app/VERSION>`, offizielles PocketBase-Release laden und gegen `pocketbase.sha256` prüfen, Datenbank anlegen (Migrationen inkl. Jakobs Konto aus der env-Datei), Notfall-Konto für `/_/` anlegen, Dienst starten, prüfen. Danach wird das Startpasswort aus der env-Datei gelöscht.
4. PocketBase holt das Zertifikat bei Let's Encrypt, sobald die Domain auf den Server zeigt und die erste Anfrage kommt.

Protokoll der Einrichtung: `/var/log/spieleschrank-install.log`.

## Ordner auf dem Server

```
/opt/spieleschrank/
  src/              Klon des Repositorys (nur zum Holen des Zweigs release)
  releases/vX.Y.Z/  app/ und deploy/ aus diesem Stand, dazu REVISION (Commit)
  current ->        aktive Version
  bin/pocketbase -> bin/pocketbase-<version>
  data/             Datenbank, Dateien, Zertifikate, nächtliche Sicherungen (data/backups)
  update-backups/   Datenbank vor jedem Update (die letzten 5)
/etc/spieleschrank/env   Domain, E-Mail, Konto-Name, Repository
```

## Updates

`spieleschrank-update.timer` startet jede Nacht um 4 Uhr (bis 20 Minuten später) `spieleschrank-update`. Steht auf `release` eine höhere Nummer in `app/VERSION` als die laufende, wird sie eingespielt; scheitert der Start, wird die Datenbank zurückgespielt, die alte Version gestartet und die Nummer in `.failed-tag` vermerkt. Gleiche oder niedrigere Nummern werden ignoriert.

Freigeben: `app/VERSION` erhöhen, `CHANGELOG.md`, committen, `main` pushen und `git push origin main:release`. Tags `vX.Y.Z` bleiben als Markierung im lokalen Repository (aus der Arbeitsumgebung lassen sie sich nicht hochladen).
PocketBase aktualisieren: `POCKETBASE_VERSION` und `pocketbase.sha256` (aus `checksums.txt` des Releases) anpassen.

## Notfall

- Hetzner-Konsole (im Browser) mit dem Root-Passwort aus der Hetzner-Mail.
- Dienst: `systemctl status spieleschrank`, Protokoll: `journalctl -u spieleschrank -n 100`.
- Sofort aktualisieren: `spieleschrank-update`, gleiche Version neu einspielen: `spieleschrank-update --force`.
- Zurück auf eine Sicherung: Dienst stoppen, `data/*.db*` aus `update-backups/…` zurückkopieren, Dienst starten. Vollständige Sicherungen (mit Dateien) liegen in `data/backups/` und lassen sich in der PocketBase-Verwaltung unter `/_/` wiederherstellen.
