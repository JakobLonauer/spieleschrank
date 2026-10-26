# Spieleschrank

Private Website, auf der Familie und Freunde Jakobs Brettspielsammlung sehen, filtern und Spiele ausleihen können.

**Aktueller Stand:** Version 0.1, klickbarer Prototyp v1 vom 26. Oktober 2026.

## Ordner

| Pfad | Inhalt |
|---|---|
| `prototyp/v1-2026-10-26/index.html` | Prototyp v1, byte-identisch mit der veröffentlichten Version |
| `prototyp/v1-2026-10-26/index-offline.html` | Dieselbe Seite als eigenständige Datei mit eingebetteten Schriften. Läuft per Doppelklick im Browser, auch ohne Internet. |
| `docs/konzept.md` | Alle Entscheidungen: Umfang, Status-Logik, Design-Leitlinien, Tokens, Datenmodell, BGG, Technik, nächste Schritte |
| `docs/design-brief.md` | Qualitätsmaßstab für die Gestaltung |
| `docs/screenshots-v1/` | Referenzbilder von v1 (Handy und Desktop, hell und dunkel) |
| `docs/schriften-lizenz/` | Lizenzen der eingebetteten Schriften (SIL OFL 1.1) |
| `CHANGELOG.md` | Was sich in welcher Version geändert hat |

## Prototyp ansehen

`index-offline.html` im Browser öffnen. Oben in der Prototyp-Leiste zwischen Lisa (Mitglied), Jakob (Verwalten) und der Anmeldeseite wechseln.

## Zurück zu Prototyp v1

Der Stand ist dreifach gesichert:

1. **Eingefrorener Link:** Das Artifact „Spieleschrank v1“ auf claude.ai wird nie mehr verändert.
2. **Dateien:** `prototyp/v1-2026-10-26/` in diesem Ordner. Weiterentwicklungen landen immer in einem neuen Ordner (`v2-…`, `v3-…`), v1 wird nie überschrieben.
3. **Git:** Dieser Ordner ist ein Git-Repository mit dem Tag `v0.1-prototyp`.
   - Alles anzeigen, was seitdem geändert wurde: `git diff v0.1-prototyp`
   - Komplett auf v1 zurücksetzen: `git checkout v0.1-prototyp`
   - Neuen Zweig ab v1 starten: `git switch -c neuer-versuch v0.1-prototyp`

## Regel für Änderungen

- Jede größere Überarbeitung bekommt einen neuen Prototyp-Ordner, einen Eintrag in `CHANGELOG.md` und einen eigenen Git-Tag.
- Entscheidungen, die sich ändern, werden in `docs/konzept.md` nachgezogen (alte Fassung bleibt über Git abrufbar).
