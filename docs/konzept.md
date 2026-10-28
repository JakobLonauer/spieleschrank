# Spieleschrank: Konzept und Entscheidungen

Stand: 28. Oktober 2026, Version 1.0 (echte App, Abschnitt 13). Was sich je Version geändert hat, steht in `CHANGELOG.md`; frühere Fassungen dieses Dokuments liegen in den Git-Tags `v0.1-prototyp` bis `v0.4-prototyp`.

Dieses Dokument hält alles fest, was bis zum ersten Prototyp entschieden wurde. Es ist die Referenz, gegen die spätere Änderungen geprüft werden.

---

> ## OBERSTE MAXIME
>
> **Perfekte, smoothe, polished User Experience geht über alles.**
>
> **Alles, was nicht zum absoluten Kern gehört, wird dezent und nicht aufdringlich umgesetzt, auch wenn Jakob es ausdrücklich bestellt:** kleine Icon-Buttons, ruhige Textlinks, Hinweise nur dort, wo man ohnehin hinschaut. **Zusatzfunktionen dürfen das Interface nie blockieren, überladen oder unterbrechen.** Alles muss nahtlos und poliert ineinandergreifen. Im Zweifel tiefer verstecken oder weglassen.
>
> **Die Maxime gilt für die Ansicht von Familie und Freunden.** Jakobs eigene Ansicht als Eigentümer darf komplexer sein und mehr Funktionen bieten, notfalls auf Kosten der Übersicht.
>
> Kern und Zusatz sind in `CLAUDE.md` abgegrenzt.

---

## 1. Kernidee

Eine private Website, auf der Familie und Freunde jederzeit Jakobs Brettspielsammlung sehen, filtern und Spiele ausleihen können.

- Visuell ansprechende Kachel-Übersicht mit Filtern
- Sichtbar, welche Spiele gerade verliehen sind (und optional an wen)
- Anfragen und Vormerkungen direkt über die Seite
- Einmalspiele (Krimi, Escape), die Jakob schon gelöst hat, werden als besonders gute Verleihkandidaten hervorgehoben

**Leitsatz:** Lieber weniger Funktionen, die dafür hervorragend funktionieren. Die Zielgruppe umfasst ältere Verwandte, ein überladenes Interface würde sie überfordern.

**Wofür es den Spieleschrank gibt (Jakob, 27.10.2026):** Jakobs Spiele sollen von Familie und Freunden genutzt werden. Niemand soll für ein Spiel zahlen, das Jakob schon hat und verleihen kann. Jakob freut sich, etwas teilen zu können und damit einen kleinen Dienst an der Gemeinschaft zu leisten. Langfristig teilen die anderen dadurch auch mehr mit ihm, entwickeln Freude am Hobby und wollen mehr spielen, und am Ende wird auch mehr mit Jakob gespielt.

**Grundannahme:** Das Ausleihen ist nur das Mittel. Der Engpass ist, überhaupt an das Spiel zu kommen. Ob jemand mit den Regeln kämpft, ist für die App vernachlässigbar.

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
3. **Leihdauer:** variabel pro Ausleihe. Seit v3 wählt die Person schon in der Anfrage einen Abholtag und ein bis drei Rückgabetage, alle innerhalb von drei Wochen (Abschnitt 11). Jakob nimmt wie gewünscht an, wählt andere Tage oder verleiht „offen“. (v1/v2: Jakob wählte beim Annehmen 2 Wochen / 1 Monat / Datum / Offen.)
4. **Sichtbarkeit:** pro Ausleihe ein Schalter „Für alle sichtbar“. An: alle sehen „Gerade bei Lisa, bis 9. Nov.“. Aus: alle anderen sehen nur „Gerade verliehen“. Jederzeit nachträglich umschaltbar. Überfällig in Rot sehen nur Jakob und die ausleihende Person.

---

## 3. Umfang

### Version 1 (bewusst klein)

**Mitglieder**
- Erster Login: Willkommensschirm mit drei Schritten und eigenem Passwort
- Regal durchsuchen und filtern
- Spiel ansehen
- Ausleihen anfragen, bzw. vormerken, wenn es verliehen ist
- „Meine“: was abholbereit ist (absagen möglich), was abgelehnt wurde (mit Grund, ausblendbar), was ich gerade habe, was ich angefragt habe
- Bei Einmalspielen: „Kenn ich schon“

**Jakob (Verwalten)**
- Anfragen annehmen (Leihdauer, Sichtbarkeit) oder ablehnen (optional mit Grund); danach jeweils „per WhatsApp Bescheid geben“ mit vorausgefülltem Text
- Direkt verleihen ohne Anfrage („Verleihen“ in der Spielansicht), etwa wenn jemand vor Ort fragt
- Übergabe und Rückgabe abhaken; bei Überfälligkeit freundlich „Erinnern“ per WhatsApp
- Spiel hinzufügen (BGG-Suche) und bearbeiten (verleihbar, Spielart, durchgespielt, Genres, Sprache der Ausgabe, Kurzbeschreibung)
- Personen anlegen (optional mit Handynummer), neues Passwort erzeugen, Zugangsanfragen bearbeiten

**WhatsApp ohne Backend:** Alle Nachrichten laufen über `wa.me`-Links mit vorausgefülltem Text. Mit hinterlegter Handynummer öffnet sich direkt der richtige Chat, ohne Nummer wählt man den Kontakt in WhatsApp aus. Gesendet wird immer erst, wenn man selbst auf Senden tippt.

### Bewusst später (oder nie)
Spieleabend-Planer, Partien-Log, Bewertungen, Direkt-Weitergabe, Statistiken, Gemeinschafts-Bibliothek mit mehreren Besitzern. (Eigene Listen und „Zu verschenken“ kamen in v3 dazu; QR-Sticker hat Jakob ausgeschlossen.) Das Feld `besitzer_id` bleibt trotzdem im Datenmodell, damit spätere Erweiterungen keinen Umbau brauchen.

**Prüffrage für jede neue Funktion:** Beantwortet sie eine Frage, die Familie und Freunde wirklich stellen? *Was hast du? Hast du es gerade da? Kann ich es haben? Bis wann habe ich es?*

---

## 4. Status-Logik (Herzstück)

Der Status eines Spiels wird **nie von Hand gesetzt**, sondern aus den Ausleih-Einträgen berechnet. Dadurch kann er nicht veralten oder sich widersprechen.

Anfrage und Ausleihe sind **ein** Eintrag mit Status:

```
vorgemerkt ──(Jakob gibt Bescheid, Person wählt Zeitraum)──┐
                                                           ▼
angefragt ──► reserviert ──► verliehen ──► zurück
    │              (angenommen,     (übergeben,
    ├─► abgelehnt   noch nicht       läuft bis zum
    └─► zurückgezogen übergeben)     letzten Rückgabetag)
```

- Ist das Spiel verliehen oder reserviert, merkt man es **vor** (ohne Daten). Reihenfolge nach Zeitpunkt. Nach der Rückgabe wird es nicht automatisch frei: Jakob tippt „Bescheid geben“, dann wählt die erste Person ihren Zeitraum und daraus wird eine normale Anfrage.
- Überfällig ist eine Ausleihe erst nach dem letzten gewählten Rückgabetag. „Offen“ verliehene Spiele werden nie überfällig.
- Erweiterungen, die mit einem Basisspiel mitgehen, hängen am selben Eintrag (`extras`). Ihr Status wird genauso berechnet.
- Annehmen geht erst, wenn das Spiel frei ist.
- Die Fälligkeit startet bei der Übergabe (außer bei festem Datum). Beim direkten Verleihen startet sie sofort.
- Bei der Rückgabe zeigt der Hinweis, wer es vorgemerkt hat.
- Eine Reservierung kann das Mitglied selbst absagen (Status `zurückgezogen`).
- Eine Ablehnung bleibt für das Mitglied sichtbar, bis es sie ausblendet (`seen`). Eine neue Anfrage auf dasselbe Spiel blendet sie automatisch aus.
- Direkt verleihen an jemanden, der das Spiel schon angefragt hat, wandelt dessen Anfrage um, statt einen zweiten Eintrag anzulegen.

**Vorrang der Abzeichen:** eigener Stand > Verliehen/Reserviert > offene Anfragen (nur Jakob) > Zu verschenken > Nur gemeinsam. „Neu“ ist seit v3 kein Abzeichen mehr, sondern ein kleines Etikett. So sieht man auch bei einem nicht verleihbaren Spiel, dass es gerade weg ist.

### Abzeichen auf den Kacheln (nur für Ausnahmen)

„Verfügbar“ ist der Normalfall und bekommt kein Abzeichen. So bleibt das Raster ruhig.

| Abzeichen | Wer sieht es | Bedeutung |
|---|---|---|
| Verliehen | alle | aktive Ausleihe |
| Reserviert | alle | angenommen, noch nicht übergeben |
| Nur gemeinsam | alle | nicht verleihbar |
| Bei dir / Abholbereit / Angefragt / Vorgemerkt | nur die betroffene Person | eigener Stand |
| Abgelehnt | nur die betroffene Person | Ablehnung noch nicht ausgeblendet |
| Gewünscht | nur die betroffene Person | „Hätte ich gern“ bei einem Spiel zum Verschenken |
| Zu verschenken | alle | von Jakob zum Verschenken markiert |
| Neu (kleines Etikett unter dem Titel, kein Abzeichen) | alle | in den letzten 2 bis 4 Wochen hinzugekommen, einstellbar |
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
9. Am Handy ist die Filterreihe einzeilig und wischbar, damit schon der erste Bildschirm Spiele zeigt (geprüft ab 320 px).
10. Kacheln zeigen nur Spielerzahl, Dauer und bei Bedarf „Englisch“. Die Schwierigkeit steht als Wort in der Spielansicht.
11. Die Begrüßung nennt neue Spiele („Neu im Regal: Heat und Mysterium“) statt eines eigenen Bereichs.
12. Annehmen und Ablehnen enden in einer kurzen Bestätigung mit WhatsApp-Knopf und „Rückgängig“.
13. Der „Rückgängig“-Hinweis bleibt stehen, solange man darauf zeigt oder ihn per Tastatur ansteuert.
14. Nach jeder Aktion landet der Tastaturfokus an einer sinnvollen Stelle (Auslöser oder Seitenüberschrift), nie im Nichts.

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
- **Bewegung:** Blatt öffnet mit `cubic-bezier(.32,.72,0,1)` in ca. 440 ms; sonstige Übergänge 150 bis 300 ms mit `cubic-bezier(.2,.8,.2,1)`. Filterwechsel lassen Kacheln per View Transition an den neuen Platz gleiten. Nur die sichtbaren Kacheln bekommen einen Übergangsnamen, so bleibt der Aufwand unabhängig von der Sammlungsgröße (gemessen: 182 Spiele ca. 0,1 s statt 0,65 s pro Filter-Tipp). Reduzierte Bewegung wird respektiert.
- **Radien:** Schachteln 7 px, Buttons 14 px, Karten 18 bis 20 px, Blatt 24 px, Chips rund.

---

## 6. Datenmodell (Skizze)

| Tabelle | Wichtigste Felder |
|---|---|
| users | Name, Benutzername, Passwort-Hash, Rolle (admin/mitglied), Avatar, Handynummer (optional), **Ort** (optional, nur für Jakob), letzter Besuch, Passwort-ändern-Pflicht |
| games | bgg_id, Titel, Anzeigename, alternative Titel, Spieler min/max, beste Spielerzahl (BGG-Umfrage), Dauer min/max, Mindestalter, Schwierigkeit (1 bis 3, aus BGG-Gewicht), Genres (eigene Tags), Sprache der Ausgabe, textlastig (aus BGG-Sprachabhängigkeit), Kurzbeschreibung, Cover-Datei, Hauptfarbe des Covers, **besitzer_id**, verleihbar, spielart (normal / einmalig_intakt / einmalig_verbraucht), durchgespielt, hinzugefügt_am, private Notiz, **art** (spiel / erweiterung / puzzle), **Empfehlungszeile** von Jakob, **Regelheft** (PDF-Datei, Sprache, Größe), **zu_verschenken**, verschenkt_an / verschenkt_am |
| Erweiterung (Felder in games) | basisspiel_id, eigenständig spielbar (ja/nein), erweitert Spielerzahl auf (z. B. 5–6), eigene Dauer. Nur Erweiterungen mit eigener Schachtel. |
| Puzzle (Felder in games) | Teilezahl, Marke, fertige Größe, Motiv, fehlende Teile, eigenes Foto der Schachtel, selbst fertig gepuzzelt |
| loans | Spiel, Person, Status (vorgemerkt / angefragt / reserviert / verliehen / zurück / abgelehnt / zurückgezogen), **Abholtag**, **Rückgabetage** (1 bis 3, innerhalb von 21 Tagen), offen (ja/nein), **extras** (mitgeliehene Erweiterungen), Nachricht, sichtbar (ja/nein), übergeben_am, zurück_am, Ablehnungsgrund, Ablehnung gesehen, Bescheid gegeben (bei Vormerkungen), **Verlängerung** (angefragt / ok / abgelehnt, höchstens einmal, +14 Tage), Foto-Hinweis gezeigt/weggetippt |
| played | Person, Spiel („kenn ich schon“) |
| photos | Ausleihe, Person, Datei (verkleinert, ohne Standortdaten), Datum, von Jakob mit Herz markiert. Nur Jakob sieht sie. |
| lists | Person, Name, Spiele. Privat, Jakob sieht sie nicht. Die „Merkliste“ gibt es immer. |
| gift_wishes | Spiel, Person, Zeitpunkt („Hätte ich gern“ bei Spielen zum Verschenken) |
| settings | Dauer der Neu-Markierung (2 bis 4 Wochen), Schaufenster-Token |
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

**Hosting (entschieden 28.10.2026):** eigener Server in der EU bei Hetzner (Ubuntu 24.04), eigene Domain. PocketBase läuft direkt als systemd-Dienst und holt das HTTPS-Zertifikat selbst bei Let's Encrypt; Docker und Caddy entfallen. Jakob richtet den Server ohne Terminal ein: Er fügt beim Anlegen eine fertige Cloud-Config ein (Domain, E-Mail, Passwort), alles Weitere läuft automatisch (Abschnitt 13). Dazu: `noindex`, Login-Versuche begrenzt, keine Tracker, nächtliche Sicherung.

**Benachrichtigungen (geplant):** in der App (Zähler); an Mitglieder über einen WhatsApp-Link mit vorausgefülltem Text, den Jakob selbst abschickt. Web-Push höchstens als Zusatz, weil er am iPhone erst nach „Zum Home-Bildschirm“ funktioniert. **Kein Telegram- oder sonstiger Bot** (von Jakob ausgeschlossen, 27.10.2026).

**Regelhefte und Fotos:** PDFs und Fotos liegen im Dateispeicher von PocketBase und werden nur an angemeldete Personen ausgeliefert (Fotos nur an Jakob). Fotos werden schon im Browser verkleinert; dabei fallen Standortdaten (EXIF/GPS) weg.

**Schaufenster:** eigene, schreibgeschützte Route `/schaufenster/<token>` ohne Login. Zeigt Cover, Titel und Eckdaten, nie Personen, Ausleihen oder Regelhefte. Neuer Link = neuer Token, der alte ist sofort ungültig.

---

## 9. Prototypen

| Version | Ordner | Eingefrorener Stand |
|---|---|---|
| v1 | `prototyp/v1-2026-10-26/` | Artifact „Spieleschrank v1“, Git-Tag `v0.1-prototyp` |
| v2 | `prototyp/v2-2026-10-26/` | Git-Tag `v0.2-prototyp` |
| v3 | `prototyp/v3-2026-10-27/` | Git-Tag `v0.3-prototyp` |
| v4 | `prototyp/v4-2026-10-27/` | Git-Tag `v0.4-prototyp`; die Arbeitsversion „Spieleschrank“ zeigt aktuell v4 |

Jeweils `index.html` (identisch mit der veröffentlichten Version) und `index-offline.html` mit eingebetteten Schriften.

### v4: Feinschliff
Gleiche Funktionen wie v3, nur ruhiger, wärmer und runder (Einzelheiten in `CHANGELOG.md`). Festgehalten für den echten Bau:
- **Tokens:** wärmere Neutraltöne (`--bg #F3F4EE`, `--surface #FFFEFB`), Schatten `--sh-xs/-sm/-lg`, Dauern `--dur-1/2/3` (0,12 / 0,18 / 0,28 s), Feder-Kurve `--spring` für kleine Bestätigungen.
- **Schrift in rem**, Bedienelemente mit `min-height` statt fester Höhe; Überschriften am Handy `min(Basis, max(vw-Grenze, 1,1–1,2 rem))`.
- **Hover nur mit Maus** (`@media (hover: hover)`), Druck-Feedback überall per `:active`.
- **Kalender:** gesperrte Tage mit `aria-disabled` statt `disabled`, damit Finger, Tastatur und Screenreader den Grund erfahren.
- Verworfen: Filz-Körnung auf dem Seitenhintergrund (verdunkelt den Ton und erzeugt Kanten an Scrollleiste und Kopfzeile).

### Prüfung von v4
- Alle Abläufe aus v3 Ende zu Ende ohne Fehler; axe-core in allen Hauptzuständen hell und dunkel ohne Verstöße.
- Kein Querscrollen bei 320 und 390 px, auch mit 150 % und 200 % Browserschrift (Regal, Spielansicht, Anfrage, Meine, Verwalten).
- 183 Spiele: Filter-Tipp weiter etwa 0,1 s.

### Prüfung von v3
- Barrierefreiheits-Audit (axe-core) in allen Hauptzuständen, hell und dunkel: Regal, Spielansicht mit Erweiterungen, Anfrage mit Kalender, Meine, Verwalten, Annehmen mit anderen Tagen, Puzzle hinzufügen, Katalog, Schaufenster, erster Login, Anmeldeseite, Puzzles als Regalbrett. Keine Verstöße.
- Kein seitliches Überlaufen bei 320 px (Regal, Kalender, Verwalten) und 390 px.
- Kalender per Tastatur: Pfeiltasten wandern über Wochen- und Monatsgrenzen, das Raster rückt mit.
- Last: 183 Spiele, Filter-Tipp ca. 0,1 bis 0,15 s.
- Alle neuen Abläufe Ende zu Ende durchgespielt (Abschnitt 11), ohne Fehler in der Konsole.

### Was die Prototypen enthalten
- Prototyp-Leiste oben: Ansicht als Lisa (Mitglied), Jakob (Verwalten), erster Login (Oma Erika), Anmeldeseite oder Schaufenster. Ab v3 zusätzlich „Puzzles als: Umschalter | Regalbrett“ zum Vergleichen.
- v3: 26 Spiele, 8 Erweiterungen (davon eine eigenständig spielbar), 11 Puzzles, 7 Personen mit Ort, Ausleihen in allen Zuständen inklusive Vormerkung mit Bescheid, Verlängerungsanfrage, Wunsch auf ein Spiel zum Verschenken, Fotos und Listen.
- Alle Abläufe aus den Abschnitten 3 und 11 sind klickbar.

**Simuliert bzw. Platzhalter**
- Cover sind generierte Platzhalter (abstrakte Muster pro Spiel, Puzzles im Querformat mit Puzzle-Raster). Im Betrieb kommen die BGG-Cover bzw. Jakobs Fotos.
- BGG-Suche nutzt eine kleine Beispielliste (Akropolis, Sky Team, Detective, Azul, drei Erweiterungen, …).
- Kein Backend: Nach dem Neuladen ist alles im Ausgangszustand. Hochgeladene Fotos und PDFs bleiben nur bis zum Neuladen.
- Jedes Passwort funktioniert; anmelden als `lisa`, `jakob`, `erika` oder `michael.gruber`.
- Beispielfotos sind gezeichnete Platzhalter. Regelheft-Links zeigen nur, wo das PDF hinkommt.
- Katalog: „Drucken oder als PDF speichern“ gibt es nur in der eigenständigen Datei (`index-offline.html`), in der Vorschau auf claude.ai nicht.
- Die Online-Version lädt die Schriften von Google Fonts; ohne Internet nimmt sie Systemschriften. Die Offline-Variante sieht immer gleich aus.

**Abweichung vom ursprünglichen Plan:** Jakob sieht „Verwalten“ statt „Meine“, damit auch er nur zwei Bereiche hat.

---

## 10. Offene Ideen aus der Review (noch nicht umgesetzt)

**Kleine Verbesserungen**
- Suche findet auch englische Originaltitel (z. B. „Wingspan“ → Flügelschlag). „ue“-Schreibweisen findet sie seit v3.
- ~~Nach einer Rückgabe die nun annehmbare Vormerkung oben hervorheben~~ → seit v3 „Wieder da, vorgemerkt“ mit „Bescheid geben“.
- ~~Verlauf pro Spiel, nur für Jakob~~ → seit v3 als Spielepass.

**Für den echten Bau**
- Echte Cover haben verschiedene Seitenverhältnisse: ganze Schachtel auf ihrer Hauptfarbe zeigen, nie beschneiden.
- Schriftgrößen in `rem`, damit die Browser-Einstellung „große Schrift“ wirkt.
- Zurück-Taste am Handy schließt das Blatt (History API).
- App-Symbol für den Startbildschirm (Web-App-Manifest) plus kurze Anleitung im Kontomenü.
- Link zu einem Spiel teilen, der direkt die Spielansicht öffnet.
- Bildschirm „Sammlung importieren“ für den BGG-Export; Zustände für langsames oder fehlendes Netz.

**Bewusst verworfen:** Zufallsgenerator, Bewertungen. Jede Funktion bräuchte ein eigenes Bedienelement für eine selten gestellte Frage.

**Von Jakob ausgeschlossen (27.10.2026):**
- **Keine KI, keine Bots** (auch kein Telegram- oder WhatsApp-Bot, keine Bilderkennung, keine KI-Regelhilfe).
- **Kein QR-Code und kein NFC.**
- Einstieg über Stimmungen statt Filter.
- Hilfen rund um Regeln (Erklär-Sprachnachricht, Schnellstart-Karten); der Regelheft-Link bleibt.

**Für später gemerkt:**
- Spieleabende über die Plattform ausmachen.
- Kinder-Modus.
- Aus der Website eine App machen, wenn alles passt.

## 11. Beschlossen für v3 (umgesetzt in Prototyp v3)

Stand 27.10.2026. Alle übrigen Fragen aus der Exploration bleiben offen. Wie v3 die Punkte umsetzt, steht am Ende des Abschnitts.

**Ausleihzeitraum**
- Bei einer Anfrage wählt man einen Abholtag und ein bis drei Rückgabetage. Die Rückgabetage dürfen beliebig verteilt sein, müssen aber alle innerhalb von drei Wochen ab dem Abholtag liegen.
- Höchstdauer drei Wochen, auch für Puzzles. Einzige Ausnahme: Jakob kann selbst „offen“ (unbefristet) verleihen.
- Überfällig erst nach dem letzten gewählten Rückgabetag.
- Verlängerung kann man anfragen, dezent über einen kleinen Icon-Button. Höchstens einmal pro Ausleihe, immer um genau zwei Wochen. Jakob entscheidet. Umsetzung: Alle gewählten Rückgabetage verschieben sich um 14 Tage; nach einer Verlängerung verschwindet der Button. Bei „offen“ verliehenen Spielen gibt es keine Verlängerung.

**Vormerkung bleibt**
- Ein zurückgegebenes Spiel wird nicht automatisch wieder frei, weil Jakob es vielleicht selbst weiterspielen will.
- Bestätigt: Vormerken ohne Daten. Nach der Rückgabe tippt Jakob „Bescheid geben“; die erste Person in der Reihe wählt dann ihren Zeitraum, daraus wird eine normale Anfrage. Ohne Bescheid bleibt die Vormerkung einfach bestehen.
- Der Status „Spiele ich gerade selbst“ wurde nicht bestätigt und bleibt vorerst weg.

**Fotos vom Spieleabend**
- Personen können während oder nach der Ausleihe Fotos hochladen oder Jakob schicken. Nur Jakob sieht sie.
- Hinweis darauf nur dezent: nie als Popup oder Push, höchstens einmal pro Ausleihe an Ort und Stelle.

**Regelhefte**
- Dezenter Link in der Spielansicht, für alle sichtbar, auch ohne Ausleihe.
- PDFs werden auf Jakobs Server gehostet, nicht nur nach BGG verlinkt (unabhängig von Änderungen auf BGG). Abrufbar nur nach Login.

**Puzzles**
- Derzeit ca. 20, wachsend, fast nur 1000 oder 500 Teile und weniger. Sichtbar für dieselben Personen wie die Spiele, gleiche Abläufe und Regeln.
- Der Umschalter „Spiele | Puzzles“ im Regal wird in v3 ausprobiert. Jakob ist nicht sicher, ob er die beste Lösung ist; Alternativen werden verglichen.
- Erfassung über eigenes Foto der Schachtel plus wenige Felder (Teilezahl, Marke, fertige Größe, Motiv, fehlende Teile). Keine KI.

**Erweiterungen**
- Jakob kann zu Basisspielen Erweiterungen angeben (teils mehrere pro Spiel).
- Standardansicht und Suche zeigen nur Basisspiele; Erweiterungen lassen sich optional einblenden.
- In der Spielansicht dezenter Hinweis auf vorhandene Erweiterungen; beim Ausleihen kann man sie zusätzlich zum Basisspiel auswählen.
- Erfasst werden nur Erweiterungen mit eigener Schachtel. Promos und alles, was in der Grundschachtel liegt, gehört einfach zum Basisspiel und wird nicht getrackt.
- Eine Erweiterung kann man auch ohne Basisspiel ausleihen.
- Eigenständig spielbare Erweiterungen (Standalone und Erweiterung zugleich) bekommen einen eigenen Eintrag und stehen auch im Standard-Regal; zusätzlich erscheinen sie in der Erweiterungsliste ihres Basisspiels.
- Nur ein Teil der Erweiterungen ist auf BGG erfasst. Der Import ordnet die erfassten automatisch zu; die übrigen fügt Jakob über die normale BGG-Suche hinzu. Ist der Treffer eine Erweiterung, fragt das Formular nach dem Basisspiel (aus den BGG-Daten vorausgefüllt, falls das Basisspiel schon im Regal steht).
- Bestätigt: Filter rechnen Erweiterungen mit ein („mit Erweiterung bis 6“), Schachtelkante hinter dem Cover als stiller Hinweis, Suche findet auch Erweiterungen, Empfehlungszeile von Jakob pro Spiel.

**Startseite: vom Katalog zur Stimme**
- Zuerst die Spiele, die die jeweilige Person selbst oft ausgeliehen hat, danach die Spiele, die insgesamt am häufigsten ausgeliehen werden.

**Eigene Listen (privat)**
- Jede Person kann sich Spiele markieren und einfache Listen anlegen, etwa „Will ich mal ausleihen“. Nur für sie selbst, Jakob sieht sie nicht.
- Nimmt wenig Platz ein und erscheint nur dort, wo es sinnvoll ist.

**Verlauf**
- Jede Person hat eine kleine eigene Historie: welche Spiele sie wann und wie lange ausgeliehen hat.
- Spielepass (Reisegeschichte einer Schachtel durch die Haushalte): vorerst nur für Jakob sichtbar.

**Neu im Regal**
- Neue Spiele werden etwa 2 bis 4 Wochen lang leicht und sehr dezent hervorgehoben, damit man beim Einloggen sieht, was neu ist.

**Zu verschenken**
- Jakob kann Spiele als „zu verschenken“ markieren.

**Spieldauer-Filter**
- Soll etwas ausgeklügelter werden als die drei Stufen in v2.

**Schaufenster-Link**
- Ein Link, den Jakob verschicken kann: abgespeckte Sicht auf die Sammlung ohne Login, ohne Ausleihen. Soll Lust machen, Zugangsdaten bei Jakob anzufragen.

**Katalog für Jakob**
- Ein Katalog der Sammlung, der sich auf Knopfdruck erstellen lässt.

**Wohnort der Personen**
- Jakob kann bei Personen einen Ort hinterlegen (z. B. „Michael Gruber, Mauthausen“) und als Admin danach filtern.

### So setzt v3 das um

**Kalender: rollendes Raster statt Monatsblatt.** Ein Monatsblatt bricht genau dort, wo es wehtut: Wer am 29. abholt, findet die Rückgabetage im nächsten Monat und muss blättern, ohne den Abholtag noch zu sehen. v3 zeigt deshalb immer fünf Wochen ab dem Montag vor dem Abholtag. Abholtag plus drei Wochen passen so immer auf einen Blick. Tage nach der Drei-Wochen-Grenze oder der nächsten Ausleihe sind ausgegraut, der 1. eines Monats trägt ein kleines Monatskürzel. Erster Tipp = Abholtag, weitere Tipps = Rückgabetage (bis zu drei, Tippen auf einen gewählten Tag nimmt ihn wieder weg). Ein Satz darunter fasst zusammen: „Du holst es ab Do., 29. Okt. und bringst es am 5. oder 12. Nov. zurück.“

**Puzzles: zwei Varianten zum Vergleichen** (Prototyp-Leiste „Puzzles als“):
1. *Umschalter* „Spiele | Puzzles“ über der Suche. Jede Seite hat eigene, passende Filter (Puzzles: Teile, Nur verfügbare, Motiv und Marke). Klar getrennt, kostet aber eine Zeile.
2. *Regalbrett*: kein Umschalter. Puzzles stehen als eigenes Regalbrett zwischen „Leih mich!“ und „Alle Spiele“, „Alle Puzzles“ führt in die Puzzle-Ansicht mit Zurück-Link. Ruhiger, Puzzles sind aber weniger prominent.
In beiden Varianten findet die Suche Spiele und Puzzles gemeinsam. Weitere geprüfte Möglichkeiten: Puzzles als Wert im Art-Filter (versteckt sie zu tief für 20 Stück) und eine reine gemeinsame Liste (Filter wie Spielerzahl passen nicht zu Puzzles).

**Erweiterungen:** eine leichte Schachtelkante hinter dem Cover zeigt, dass es Erweiterungen gibt. In der Spielansicht klappt „2 Erweiterungen“ die Liste auf; beim Anfragen setzt man einen Haken bei den gewünschten. „Erweiterungen zeigen“ steckt unter „Mehr Filter“. Der Personen-Filter rechnet Erweiterungen mit ein und sagt es auf der Kachel („bis 6 mit Erw.“).

**Spieldauer:** sieben Stufen von „bis 20 Min“ bis „länger als 2 Std“. Ist auch eine Personenzahl gewählt, schätzt v3 die Dauer für genau diese Zahl (lineare Schätzung zwischen kürzester und längster Angabe) und zeigt sie auf der Kachel („ca. 2 Std zu sechst“).

**Startseite:** Sortierung „Für dich“ (eigene häufige Ausleihen, dann insgesamt beliebte; schon gespielte Einmalspiele zählen nicht) oder A–Z. Jakob sieht „Beliebt“.

**Fotos:** kleines Kamera-Symbol neben „Bei dir“ und bei „Zuletzt zurückgegeben“; ein einmaliger, wegtippbarer Satz unter der Ausleihe. Bilder werden im Browser verkleinert, Standortdaten entfallen. Jakob sieht sie unter „Fotos vom Spieleabend“ und im Spielepass, kann ein Herz vergeben; die Person sieht dann „Jakob hat sich über deine Fotos gefreut.“

**Listen:** Lesezeichen-Symbol links neben dem Hauptknopf der Spielansicht. Ein Tipp legt das Spiel auf die Merkliste (Hinweis mit „Andere Liste“). Ist es schon gemerkt, öffnet der Tipp ein kleines Blatt mit allen Listen zum An- und Abhaken und für neue Listen. Unter „Meine“ erscheinen sie als Cover-Reihen.

**Verlauf:** „Früher ausgeliehen (n)“ zugeklappt am Ende von „Meine“. Spielepass in Jakobs Spielansicht.

**Zu verschenken:** Abzeichen auf der Kachel, Filter „Nur zu verschenken“ unter „Mehr Filter“, Knopf „Hätte ich gern“. Jakob sieht die Wünsche gesammelt und verschenkt mit einem Tipp; das Spiel wandert dann in „Verschenkt“ unter Werkzeuge.

**Jakobs Werkzeuge** (unten in Verwalten): Katalog (Spiele, Erweiterungen, Puzzles, sortiert nach Titel oder Genre), Schaufenster-Link (kopieren, neuen Link erzeugen mit Bestätigung), Spiele ohne Regelheft, Verschenkt, Einstellungen (Dauer der Neu-Markierung).

## 12. Nächste Schritte

1. Jakob: GitHub-Repository `spieleschrank` anlegen, Domain kaufen, Hetzner-Server mit der Cloud-Config anlegen, DNS-Eintrag setzen (Anleitung „Spieleschrank einrichten“).
2. BGG-Anwendung registrieren; den Schlüssel trägt Jakob später selbst unter Verwalten → Einstellungen ein.
3. Sammlung importieren, Familie anlegen, testen lassen.
4. Danach Schritt für Schritt Updates aus dem Verbesserungsplan (T01–T07 brauchen jetzt keinen Prototyp mehr, T11–T14 haben ihren Server).

---

## 13. Echte App (v1.0, 28.10.2026)

**Aufbau**
- `app/`: PocketBase 0.40.6. Datenmodell als Migration (`pb_migrations`), Serverlogik als JavaScript-Hooks (`pb_hooks`), Oberfläche als eine Datei (`pb_public/index.html`), gebaut aus `app/src` mit `tools/build.py`. Die Oberfläche ist die aus Prototyp v4; statt Beispieldaten gleicht sie jede Änderung mit dem Server ab.
- `deploy/`: Cloud-Config, Einrichtungsskript, Update-Skript, systemd-Dienste, PocketBase-Version mit Prüfsummen.

**Sicherheit und Datenschutz liegen auf dem Server, nicht in der Oberfläche**
- Zugriffsregeln je Tabelle: Mitglieder sehen nur ihre eigenen Ausleihen, Listen, Wünsche und Fotos. Ausleihen anderer kommen über eine eigene Ansicht ohne Person (Name nur, wenn „sichtbar“).
- Hooks prüfen jede Ausleihe wie die Oberfläche: Abholtag, 1 bis 3 Rückgabetage innerhalb von 21 Tagen, keine Überschneidung, eine Verlängerung um 14 Tage, Rücknahme binnen 3 Minuten. Mitglieder dürfen nur die Felder ändern, die ihnen zustehen.
- Konten legt nur Jakob an; der letzte Admin kann nicht gelöscht oder herabgestuft werden.
- Private Notiz, Schaufenster-Token und BGG-Schlüssel sieht nur Jakob. Regelhefte und Fotos gibt es nur mit kurzlebigem Datei-Token.
- Anmelden: höchstens 6 Versuche in 15 Sekunden je Internetanschluss (reicht fürs Familienfest im selben WLAN). Protokolle ohne IP-Adressen, 14 Tage.

**BoardGameGeek**
- Der Schlüssel steht in den Einstellungen der App (Jakob trägt ihn selbst ein), ersatzweise in der Server-Einrichtung.
- Suche, Details und Cover laufen über den Server; Cover nur von `cf.geekdo-images.com`.
- Import des BGG-Exports (collection.csv): legt alles auf einmal an, nicht als „Neu“. Danach ergänzt der Server jede Minute bis zu 20 Einträge mit Cover, Eckdaten, anderen Titeln und ordnet Erweiterungen ihrem Grundspiel zu.
- Erweiterungen ohne Grundspiel erscheinen bei Jakob unter Werkzeuge → „Ohne Grundspiel“, bis sie zugeordnet sind.

**Betrieb ohne Terminal**
- Automatische Sicherheitsupdates von Ubuntu, bei Bedarf Neustart um 5 Uhr.
- Firewall: nur 80/443, SSH gebremst und nur mit Schlüssel.
- PocketBase sichert jede Nacht um 3:30 Uhr alles (Datenbank und Dateien), 7 Tage lang. Empfohlen: Hetzner-Backups dazubuchen (Kopie außerhalb des Servers).
- Updates: Jede Nacht um 4 Uhr schaut der Server, ob auf dem Zweig `release` eine höhere Versionsnummer (`app/VERSION`) liegt. Wenn ja: Dienst stoppen, Datenbank sichern, umschalten, starten, prüfen. Startet die neue Version nicht sauber, kommt die Sicherung zurück und die alte Version läuft weiter; diese Version wird nicht noch einmal versucht.
- Freigeben heißt also: `app/VERSION` erhöhen, committen, `main` nach `release` pushen.

**Neu gegenüber Prototyp v4**
- Passwort ändern im Konto-Menü (für alle).
- BGG-Schlüssel in den Einstellungen.
- „Ohne Grundspiel“ unter Werkzeuge.
- Quellenangabe „Powered by BGG“ am Ende des Spielblatts (Link zur BGG-Seite des Spiels) und des Schaufensters.
