# Spieleschrank

Private Website, auf der Familie und Freunde Jakobs Brettspielsammlung sehen, filtern und Spiele ausleihen können.

**Aktueller Stand:** Version 0.4, klickbarer Prototyp v4 (Feinschliff) vom 27. Oktober 2026.

## Ordner

| Pfad | Inhalt |
|---|---|
| `prototyp/v4-2026-10-27/` | Prototyp v4 (aktuell): `index.html` identisch mit der veröffentlichten Version, `index-offline.html` als eigenständige Datei mit eingebetteten Schriften |
| `prototyp/v3-2026-10-27/` | Prototyp v3 (Referenz), gleicher Aufbau |
| `prototyp/v2-2026-10-26/` | Prototyp v2 (Referenz), gleicher Aufbau |
| `prototyp/v1-2026-10-26/` | Prototyp v1 (Referenz, wird nie verändert), gleicher Aufbau |
| `docs/konzept.md` | Alle Entscheidungen: Umfang, Status-Logik, Design-Leitlinien, Tokens, Datenmodell, BGG, Technik, offene Ideen, nächste Schritte |
| `docs/design-brief.md` | Qualitätsmaßstab für die Gestaltung |
| `docs/screenshots-v1/` bis `docs/screenshots-v4/` | Referenzbilder (Handy und Desktop, hell und dunkel) |
| `docs/schriften-lizenz/` | Lizenzen der eingebetteten Schriften (SIL OFL 1.1) |
| `CHANGELOG.md` | Was sich in welcher Version geändert hat |

## Prototyp ansehen

`index-offline.html` im Browser öffnen. Oben in der Prototyp-Leiste zwischen Lisa (Mitglied), Jakob (Verwalten), dem ersten Login, der Anmeldeseite und dem Schaufenster wechseln. „Puzzles als“ schaltet zwischen den beiden Puzzle-Varianten um.

## Zu einem früheren Stand zurück

Jede Version ist mehrfach gesichert:

1. **Ordner:** Jede Version hat ihren eigenen Ordner unter `prototyp/`. Ältere Ordner werden nie überschrieben.
2. **Git-Tags:** `v0.1-prototyp` (v1), `v0.2-prototyp` (v2), `v0.3-prototyp` (v3) und `v0.4-prototyp` (v4).
   - Alles anzeigen, was seit v1 geändert wurde: `git diff v0.1-prototyp`
   - Ganzes Projekt auf einen Stand setzen: `git checkout v0.1-prototyp` (zurück zur Gegenwart: `git switch main`)
   - Neuen Versuch ab einem Stand starten: `git switch -c neuer-versuch v0.4-prototyp`
3. **Links auf claude.ai:** „Spieleschrank v1“ ist eingefroren. „Spieleschrank“ ist die Arbeitsversion und zeigt immer den neuesten Stand. Verlässlich zurück kommst du über Ordner und Git-Tags.

## Regel für Änderungen

- Jede größere Überarbeitung bekommt einen neuen Prototyp-Ordner, einen Eintrag in `CHANGELOG.md` und einen eigenen Git-Tag.
- Entscheidungen, die sich ändern, werden in `docs/konzept.md` nachgezogen (alte Fassungen bleiben über Git abrufbar).
