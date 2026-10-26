# Spieleschrank: Konzept und Entscheidungen

Stand: 26. Oktober 2026, Version 0.1 (Prototyp v1)

Dieses Dokument hält alles fest, was bis zum ersten Prototyp entschieden wurde. Es ist die Referenz, gegen die spätere Änderungen geprüft werden.

---

## 1. Kernidee

Eine private Website, auf der Familie und Freunde jederzeit Jakobs Brettspielsammlung sehen, filtern und Spiele ausleihen können.

- Visuell ansprechende Kachel-Übersicht mit Filtern
- Sichtbar, welche Spiele gerade verliehen sind (und optional an wen)
- Anfragen und Vormerkungen direkt über die Seite
- Einmalspiele (Krimi, Escape), die Jakob schon gelöst hat, werden als besonders gute Verleihkandidaten hervorgehoben

**Leitsatz:** Lieber weniger Funktionen, die dafür hervorragend funktionieren. Die Zielgruppe umfasst ältere Verwandte, ein überladenes Interface würde sie überfordern.

---

## 2. Rahmenentscheidungen

| Thema | Entscheidung |
|---|---|
| Form | Website, kein App-Store. Läuft auf jedem Handy und Computer. |
| Zugang | Nur mit Login. Kein Selbst-Registrieren. Jakob legt Benutzername und Startpasswort an und gibt sie weiter. Beim ersten Login muss das Passwort geändert werden. „Angemeldet bleiben“ ca. 90 Tage. |
| Zugang anfragen | Auf der Anmeldeseite gibt es „Zugang anfragen“. Das erzeugt nur einen Eintrag bei Jakob. |
| Passwort vergessen | Jakob setzt es zurück. Kein Mailserver nötig. |
| Spieldaten | Eckdaten und Cover kommen von BoardGameGeek (BGG). |
| Hauptliste | Die App ist die Hauptliste der Sammlung. BGG ist nur Datenquelle. Abgleich über die BGG-ID, keine Dubletten. |
| Hosting | Jakob hat noch nichts. Empfehlung: kleiner VPS in der EU (z. B. Hetzner) mit eigener Domain. |

### Antworten aus der Planung (26.10.2026)

1. **Hosting:** komplett bei null → VPS in der EU, eigene (Sub-)Domain, HTTPS über Caddy.
2. **BGG-Sammlung:** großteils auf BGG erfasst, aber nicht vollständig, wächst ständig → einmaliger Import der als „besitze ich“ markierten Spiele, danach Neuzugänge über „+ Spiel“ mit BGG-Suche. Optional später: „Mit BGG abgleichen“ zeigt nur Spiele, die auf BGG stehen und in der App fehlen.
3. **Leihdauer:** variabel pro Ausleihe. Beim Annehmen: 2 Wochen / 1 Monat / Datum / Offen. Vorausgewählt ist die zuletzt gewählte Option.
4. **Sichtbarkeit:** pro Ausleihe ein Schalter „Für alle sichtbar“. An: alle sehen „Gerade bei Lisa, bis 9. Nov.“. Aus: alle anderen sehen nur „Gerade verliehen“. Jederzeit nachträglich umschaltbar. Überfällig in Rot sehen nur Jakob und die ausleihende Person.

---

## 3. Umfang

### Version 1 (bewusst klein)

**Mitglieder**
- Regal durchsuchen und filtern
- Spiel ansehen
- Ausleihen anfragen, bzw. vormerken, wenn es verliehen ist
- „Meine“: was ich gerade habe, was abholbereit ist, was ich angefragt habe
- Bei Einmalspielen: „Kenn ich schon“

**Jakob (Verwalten)**
- Anfragen annehmen (Leihdauer, Sichtbarkeit) oder ablehnen (optional mit Grund)
- Übergabe und Rückgabe abhaken
- Spiel hinzufügen (BGG-Suche) und bearbeiten (verleihbar, Spielart, durchgespielt, Genres, Kurzbeschreibung)
- Personen anlegen, neues Passwort erzeugen, Zugangsanfragen bearbeiten

### Bewusst später (oder nie)
Spieleabend-Planer, Partien-Log, Bewertungen, Wunschliste, Geschenk-Modus, QR-Sticker, Direkt-Weitergabe, Statistiken, Gemeinschafts-Bibliothek mit mehreren Besitzern. Das Feld `besitzer_id` bleibt trotzdem im Datenmodell, damit spätere Erweiterungen keinen Umbau brauchen.

**Prüffrage für jede neue Funktion:** Beantwortet sie eine Frage, die Familie und Freunde wirklich stellen? *Was hast du? Hast du es gerade da? Kann ich es haben? Bis wann habe ich es?*

---

## 4. Status-Logik (Herzstück)

Der Status eines Spiels wird **nie von Hand gesetzt**, sondern aus den Ausleih-Einträgen berechnet. Dadurch kann er nicht veralten oder sich widersprechen.

Anfrage und Ausleihe sind **ein** Eintrag mit Status:

```
angefragt ──► reserviert ──► verliehen ──► zurück
    │              (angenommen,     (übergeben,
    ├─► abgelehnt   noch nicht       Fälligkeit läuft)
    └─► zurückgezogen übergeben)
```

- Eine Anfrage auf ein verliehenes oder reserviertes Spiel ist automatisch eine **Vormerkung**. Reihenfolge nach Zeitpunkt.
- Annehmen geht erst, wenn das Spiel frei ist.
- Die Fälligkeit startet bei der Übergabe (außer bei festem Datum).
- Bei der Rückgabe zeigt der Hinweis, wer es vorgemerkt hat.

### Abzeichen auf den Kacheln (nur für Ausnahmen)

„Verfügbar“ ist der Normalfall und bekommt kein Abzeichen. So bleibt das Raster ruhig.

| Abzeichen | Wer sieht es | Bedeutung |
|---|---|---|
| Verliehen | alle | aktive Ausleihe |
| Reserviert | alle | angenommen, noch nicht übergeben |
| Nur gemeinsam | alle | nicht verleihbar |
| Bei dir / Abholbereit / Angefragt / Vorgemerkt | nur die betroffene Person | eigener Stand |
| Rückgabe fällig | nur die betroffene Person | eigene Ausleihe überfällig |
| Überfällig | nur Jakob | fremde Ausleihe überfällig |
| 1 Anfrage / N Anfragen | nur Jakob | offene Anfragen |

Offene Anfragen anderer Personen sieht niemand außer Jakob.

### Einmalspiele

Zwei Felder statt einem Haken:
1. **Spielart:** normal / Einmalspiel, Material bleibt komplett (Unlock, Deckscape, Sherlock Holmes Consulting Detective, MicroMacro) / Einmalspiel, Material wird verbraucht (EXIT, Legacy)
2. **Durchgespielt:** ja/nein

Komplette Einmalspiele, die Jakob durchgespielt hat und die verleihbar sind, erscheinen automatisch im Regalbrett **„Leih mich!“** ganz oben und tragen einen gelben Aufkleber.

Mitglieder können bei Einmalspielen „Kenn ich schon“ markieren. Jakob sieht dann pro Spiel „Kennen es schon“ und „Noch nicht gespielt“, also wem er es anbieten kann.

---

## 5. Design-Leitlinien

**Qualitätsmaßstab:** siehe `design-brief.md` (Frontend-Excellence-Brief). Scope-Regel daraus: Gestaltungsarbeit verändert keine Funktionen, Daten oder Abläufe.

### Struktur
1. Mitglieder haben nur zwei Bereiche: **Regal** und **Meine**. Jakob hat **Regal** und **Verwalten** (er leiht seine eigenen Spiele nicht aus).
2. Handy: Tab-Leiste unten, Spieldetails als Blatt von unten (wischen zum Schließen). Desktop: Tabs oben, Details als Seitenpanel rechts.
3. Ein Hauptbutton pro Ansicht.
4. Abzeichen nur für Ausnahmen.
5. Filter schrittweise: sichtbar sind Suche, „Personen“, „Spieldauer“, „Nur verfügbare“. Genre, Schwierigkeit und Alter liegen hinter „Mehr Filter“.
6. Alltagssprache: „Schwierigkeit: leicht / mittel / anspruchsvoll“ statt BGG-Gewicht.
7. Rückgängig statt Nachfragen: umkehrbare Aktionen passieren sofort, mit „Rückgängig“ im Hinweis unten. Kein Bestätigungsdialog (Ausnahme: neues Passwort erzeugen, weil nicht umkehrbar).
8. Leerer Filterzustand schlägt vor, welcher Filter die meisten Treffer zurückbringt.

### Visuelle Sprache
- **Die Cover sind die Farbe.** Die Oberfläche bleibt ruhig in filzgrün getönten Neutraltönen (Spieltisch).
- Kacheln wirken wie echte Schachteln: dunklere Kante unten, Schatten, leichte Papierkörnung.
- Einziger „lauter“ Moment: das Regalbrett „Leih mich!“ mit gelben Aufklebern, und der Filzstapel auf der Anmeldeseite.
- Dunkelmodus automatisch nach Systemeinstellung.
- Mindestens 16 px Schrift für Fließtext, große Tippflächen, WCAG-AA-Kontraste.
- Datumsformat österreichisch (`de-AT`, z. B. „9. Nov.“, „Jän.“).

### Design-Tokens (Prototyp v1)

| Token | Hell | Dunkel |
|---|---|---|
| Hintergrund `--bg` | #F2F5F1 | #0E1512 |
| Fläche `--surface` | #FFFFFF | #151E1A |
| Fläche 2 `--surface-2` | #E9EEE7 | #1D2823 |
| Text `--fg` | #16201B | #E5EDE8 |
| Text 2 `--fg-2` | #45534C | #B2C0B8 |
| Akzent Spieltisch-Grün `--accent` | #1F6B57 | #7CC6A5 |
| Filz (Anmeldung) `--felt` | #1E604F | #123A30 |
| Aufkleber `--sticker` | #FFC83D | #F6C447 |
| Verliehen | #FBE5C2 / #744500 | #3A2A12 / #F2C77C |
| Reserviert | #DCE5F8 / #22428A | #1C2845 / #AEC4F4 |
| Gefahr | #FBE2DE / #B02A20 | #3A1714 / #F29A8F |
| Regalbrett | #DCCBAE → #C7B291 | #5B4C3A → #4A3D2E |

- **Schriften:** Bricolage Grotesque (Titel, Wortmarke, Überschriften), Figtree (Oberfläche, Fließtext). Beide unter SIL Open Font License.
- **Bewegung:** Blatt öffnet mit `cubic-bezier(.32,.72,0,1)` in ca. 440 ms; sonstige Übergänge 150 bis 300 ms mit `cubic-bezier(.2,.8,.2,1)`. Filterwechsel lassen Kacheln per View Transition an den neuen Platz gleiten. Reduzierte Bewegung wird respektiert.
- **Radien:** Schachteln 7 px, Buttons 14 px, Karten 18 bis 20 px, Blatt 24 px, Chips rund.

---

## 6. Datenmodell (Skizze)

| Tabelle | Wichtigste Felder |
|---|---|
| users | Name, Benutzername, Passwort-Hash, Rolle (admin/mitglied), Avatar, Passwort-ändern-Pflicht |
| games | bgg_id, Titel, Anzeigename, Spieler min/max, Dauer min/max, Mindestalter, Schwierigkeit (1 bis 3, aus BGG-Gewicht), Genres (eigene Tags), Kurzbeschreibung, Cover-Datei, Hauptfarbe des Covers, **besitzer_id**, verleihbar, spielart (normal / einmalig_intakt / einmalig_verbraucht), durchgespielt, private Notiz |
| loans | Spiel, Person, Status (angefragt / reserviert / verliehen / zurück / abgelehnt / zurückgezogen), Wunsch (asap/Datum), Wunschdatum, Nachricht, Leihdauer (2w/1m/date/open), festes Datum, sichtbar (ja/nein), verliehen_am, fällig_am, zurück_am, Ablehnungsgrund |
| played | Person, Spiel („kenn ich schon“) |
| access_requests | Name, Kontakt, Nachricht, Status |

**Genres (eigene Tags):** Familie, Strategie, Party, Kooperativ, Rätsel & Krimi, Zu zweit, Kartenspiel. Beim Import über eine Zuordnungstabelle aus den BGG-Kategorien vorbelegt, von Jakob korrigierbar.

**Hauptfarbe des Covers:** wird beim Import einmal berechnet und als Platzhalter gezeigt, bis das Bild geladen ist. Kein weißes Aufblitzen, kein springendes Layout.

---

## 7. BoardGameGeek-Anbindung

- Seit der BGG-Richtlinie vom Juli 2025 braucht jede Anfrage an die XML-API2 ein Bearer-Token aus einer **registrierten Anwendung**, sonst kommt 401. Die nicht-kommerzielle Lizenz ist kostenlos, die Freigabe kann eine Woche oder länger dauern. **→ Anwendung früh registrieren:** https://boardgamegeek.com/applications
- Anfragen an `boardgamegeek.com` **ohne** `www`, sonst wird das Token ignoriert.
- Nur XML, keine JSON-API, keine Schreib-API.
- Höchstens etwa eine Anfrage alle zwei Sekunden.
- Sammlungsabfragen werden in eine Warteschlange gestellt; der erste Aufruf liefert oft HTTP 202, der Server muss wiederholen.
- Ohne Token sofort möglich: die eigene Sammlung eingeloggt auf der BGG-Website exportieren und per Skript importieren.
- Quellenangabe auf der Seite einplanen (BGG-Hinweis mit Link zurück); genaue Bedingungen bei der Registrierung prüfen.

**Architektur-Folge:** Das Token liegt nur auf dem Server (Umgebungsvariable), nie im Browser. Alle BGG-Aufrufe laufen über den eigenen Server. Mitglieder lösen nie BGG-Aufrufe aus, nur Jakob beim Hinzufügen. Daten und Cover werden einmal gespeichert; die Seite funktioniert auch, wenn BGG langsam oder offline ist.

**Ablauf „Spiel hinzufügen“:** Titel tippen → Server sucht bei BGG → Trefferliste mit Jahr und Cover (wegen Neuauflagen) → Treffer wählen → Server holt Details inkl. Statistik → Formular vorausgefüllt, Jakob ergänzt eigene Felder → Cover wird lokal gespeichert.

Quellen (Stand August 2026, Dokumentation eines Open-Source-Projekts; verbindlich ist die offizielle BGG-Seite):
- https://boardgamegeek.com/using_the_xml_api
- https://git.kestrelsnest.social/eric/bggpipe/src/branch/main/.claude/skills/bgg-api/SKILL.md

---

## 8. Technik und Hosting

**Empfehlung: PocketBase + schlankes Frontend**
- Ein einzelnes Programm mit SQLite-Datenbank, Benutzerverwaltung mit Passwort-Login, Dateispeicher und Admin-Oberfläche.
- Benutzer im Admin-Panel anlegen passt genau zum Vergabemodell.
- BGG-Zugriff als Server-Skript in PocketBase; Token in einer Umgebungsvariable.
- Backup heißt: einen Ordner kopieren.
- Frontend: der Prototyp wird zur echten Oberfläche (statisch ausgeliefert, von PocketBase mitgeliefert).

**Alternative:** SvelteKit oder Next.js mit SQLite im Docker-Container. Mehr Kontrolle, aber Login, Admin und Uploads selbst bauen.

**Hosting-Schritte:** Domain kaufen → VPS anlegen → DNS auf den Server → Docker Compose mit PocketBase und Caddy (holt HTTPS automatisch). Dazu: `noindex`, Login-Versuche begrenzen, keine Tracker, nächtliches Backup.

**Benachrichtigungen (geplant):** in der App (Zähler); an Jakob per Telegram-Bot; an Mitglieder zunächst über einen WhatsApp-Link mit vorausgefülltem Text. Web-Push nur als Zusatz, weil er am iPhone erst nach „Zum Home-Bildschirm“ funktioniert.

---

## 9. Prototyp v1: was drin ist

Datei: `prototyp/v1-2026-10-26/index.html` (identisch mit der veröffentlichten Version), plus `index-offline.html` mit eingebetteten Schriften.

- Prototyp-Leiste oben: Ansicht als Lisa (Mitglied), Jakob (Verwalten) oder Anmeldeseite.
- 26 Beispielspiele, 6 Personen, Beispiel-Ausleihen in allen Zuständen (verliehen, überfällig, reserviert, angefragt, vorgemerkt, nicht sichtbar).
- Alle Abläufe aus Abschnitt 3 sind klickbar.

**Simuliert bzw. Platzhalter**
- Cover sind generierte Platzhalter (abstrakte Muster pro Spiel). Im Betrieb kommen die BGG-Cover.
- BGG-Suche nutzt eine kleine Beispielliste (Akropolis, Sky Team, Detective, Azul, …).
- Kein Backend: Nach dem Neuladen ist alles im Ausgangszustand.
- Jedes Passwort funktioniert; anmelden als `lisa` oder `jakob`.
- Die Online-Version lädt die Schriften von Google Fonts; ohne Internet nimmt sie Systemschriften. Die Offline-Variante sieht immer gleich aus.

**Abweichung vom ursprünglichen Plan:** Jakob sieht „Verwalten“ statt „Meine“, damit auch er nur zwei Bereiche hat.

---

## 10. Nächste Schritte

1. BGG-Anwendung registrieren (Freigabe dauert).
2. Prototyp weiter schleifen: Jakobs konkrete Korrekturen.
3. Domain und VPS besorgen.
4. PocketBase-Schema nach Abschnitt 6 anlegen.
5. Prototyp an PocketBase anbinden (Login, Spiele, Ausleihen).
6. BGG-Import (CSV-Export als Start, danach API mit Token).
7. Familie testen lassen, dann Phase 2 (Erinnerungen, Benachrichtigungen).
