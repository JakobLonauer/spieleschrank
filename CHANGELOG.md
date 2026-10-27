# Changelog

## v0.3-prototyp (27.10.2026)

Alle Entscheidungen für v3 aus der Exploration umgesetzt. Was nicht zum Kern gehört, sitzt als kleines Symbol oder ruhiger Link dort, wo man ohnehin hinschaut.

**Ausleihen**
- Anfrage mit Kalender: ein Abholtag und ein bis drei Rückgabetage, alle innerhalb von drei Wochen. Rollendes Fünf-Wochen-Raster statt Monatsblatt, damit Abholtag und alle möglichen Rückgabetage immer auf einen Blick passen, auch über ein Monatsende. Bedienbar mit Pfeiltasten
- Jakob nimmt wie gewünscht an, wählt andere Tage oder verleiht „offen“; beim direkten Verleihen genauso
- Verlängerung über ein kleines Symbol bei „Bei dir“: einmal, um genau zwei Wochen, Jakob entscheidet
- Vormerkung ohne Daten. Nach der Rückgabe „Bescheid geben“, dann wählt die erste Person unter „Wieder da“ ihren Zeitraum
- Überfällig erst nach dem letzten Rückgabetag

**Erweiterungen**
- Nur Erweiterungen mit eigener Schachtel; Schachtelkante hinter dem Cover als stiller Hinweis
- Spielansicht: aufklappbare Liste, beim Anfragen zum Mitausleihen anhakbar; auch allein ausleihbar
- Eigenständig spielbare Erweiterungen stehen zusätzlich als eigene Kachel im Regal
- Personen-Filter rechnet Erweiterungen mit ein („bis 6 mit Erw.“), Suche findet Erweiterungen, „Erweiterungen zeigen“ unter „Mehr Filter“
- Empfehlungszeile von Jakob pro Spiel; BGG-Suche erkennt Erweiterungen und schlägt das Basisspiel vor

**Puzzles**
- Eigene Puzzle-Ansicht mit passenden Filtern (Teile, Nur verfügbare, Motiv, Marke), Querformat-Cover, fehlende Teile
- Zwei Varianten zum Vergleichen in der Prototyp-Leiste: Umschalter „Spiele | Puzzles“ oder Puzzle-Regalbrett im Regal
- Erfassung über eigenes Foto plus wenige Felder; Rückgabe fragt „Alle Teile da?“

**Für Familie und Freunde (dezent)**
- Sortierung „Für dich“ (eigene häufige Ausleihen, dann beliebte) oder A–Z
- Spieldauer in sieben Stufen; mit gewählter Personenzahl Schätzung auf der Kachel („ca. 2 Std zu sechst“)
- Regelheft-Link in der Spielansicht
- Fotos vom Spieleabend über ein Kamera-Symbol, nur für Jakob sichtbar, Standortdaten werden entfernt
- Private Listen über ein Lesezeichen-Symbol, Merkliste immer da
- Eigener Verlauf „Früher ausgeliehen“, zugeklappt
- „Neu“ als kleines Etikett für 2 bis 4 Wochen (einstellbar); die Begrüßung nennt Neues seit dem letzten Besuch
- Spiele zum Verschenken mit „Hätte ich gern“
- Suche findet „ue“-Schreibweisen („fluegel“ → Flügelschlag)

**Für Jakob**
- Ort pro Person mit Filter in Verwalten
- Spielepass (Reisegeschichte einer Schachtel) und Fotos in der Spielansicht
- Anfragen, Verlängerungen und Wünsche gesammelt; „Wieder da, vorgemerkt“ mit „Bescheid geben“
- Werkzeuge: Katalog auf Knopfdruck (druckbar), Schaufenster-Link ohne Login, Spiele ohne Regelheft, Verschenkt, Einstellungen
- Schaufenster: reduzierte Ansicht der Sammlung ohne Login und ohne Ausleihen, mit „Zugang anfragen“

**Geprüft:** axe-core in allen Hauptzuständen hell und dunkel ohne Verstöße, kein Überlaufen ab 320 px, 183 Spiele flüssig.

## v0.2-prototyp (26.10.2026)

Ergebnis der Review: alle gefundenen Lücken geschlossen, sechs gezielte Verbesserungen. Die Oberfläche hat dabei kein zusätzliches Bedienelement im Regal bekommen.

**Lücken geschlossen**
- Ablehnungen kommen an: Mitglieder sehen sie samt Grund unter „Meine“ und in der Spielansicht, bis sie sie ausblenden; danach „Nochmal anfragen“
- Jakob kann direkt verleihen („Verleihen“ in der Spielansicht: Person, Leihdauer, Sichtbarkeit), eine vorhandene Anfrage der Person wird dabei übernommen
- Mitglieder können eine Reservierung absagen
- Erster Login: Willkommensschirm mit drei Schritten und eigenem Passwort (in der Prototyp-Leiste: „Erster Login“)
- „Verliehen“ und „Reserviert“ haben Vorrang vor „Nur gemeinsam“
- Tastatur und Screenreader: Fokus landet nach Aktionen nie mehr im Nichts, Filter-Popup schließt beim Wegtabben und führt zum nächsten Filter, BGG-Trefferliste als echte Liste, Anmeldeseite mit Hauptbereich, „Rückgängig“-Hinweis pausiert bei Hover und Fokus

**Verbesserungen**
- Nach Annehmen und Ablehnen: Bestätigung mit „per WhatsApp Bescheid geben“ (vorausgefüllter Text) und „Rückgängig“; bei Überfälligkeit „Erinnern“; optionale Handynummer pro Person
- Handy: einzeilige, wischbare Filterreihe und kompaktere Begrüßung, damit der erste Bildschirm Spiele zeigt
- Kacheln ohne Schwierigkeits-Punkte; Hinweis „Englisch“ bei englischen Ausgaben
- Filtern bleibt auch bei großen Sammlungen flüssig (nur sichtbare Kacheln animiert; 182 Spiele: ca. 0,1 s statt 0,65 s)
- Spielansicht: „am besten mit 3–4“ und Hinweis zur englischen Ausgabe samt Textmenge; Sprache der Ausgabe im Bearbeiten-Formular
- „Neu“-Abzeichen für 30 Tage, Begrüßung nennt die Neuzugänge
- Kleinigkeiten: Titel im Spielblatt nicht mehr unter dem Schließen-Knopf, Hinweise bei offenem Blatt über der Fußleiste, Listen-Aktionen brechen auf schmalen Handys sauber um, Leihdauer-Auswahl unter 360 px als 2×2-Raster, Suche und Filter auf dem Tablet untereinander

## v0.1-prototyp (26.10.2026)

Erster klickbarer Prototyp, ohne Backend, mit Beispieldaten.

- Anmeldeseite mit Filz-Stapel, „Zugang anfragen“
- Regal: Begrüßung, Suche, Filter (Personen, Spieldauer, Nur verfügbare, Mehr Filter mit Genre, Schwierigkeit, Alter), Regalbrett „Leih mich!“, Kachelraster mit Abzeichen nur für Ausnahmen, leerer Zustand mit Filtervorschlag
- Spielansicht als Blatt (Handy) bzw. Seitenpanel (Desktop), Status, Eckdaten, Einmalspiel-Block mit „Kenn ich schon“
- Anfrage- und Vormerk-Ablauf mit Bestätigung und WhatsApp-Link
- Meine: abholbereit, bei dir (mit Restlaufzeit), angefragt (zurückziehen)
- Verwalten: Anfragen annehmen (Leihdauer, Sichtbarkeit mit Vorschau) oder ablehnen (mit Grund), Übergabe, Rückgabe mit Hinweis auf Vormerkung, Sichtbarkeit umschalten, Spiel hinzufügen über simulierte BGG-Suche, Spiel bearbeiten, Personen anlegen, neues Passwort, Zugangsanfragen
- Rückgängig für alle umkehrbaren Aktionen
- Hell- und Dunkelmodus, reduzierte Bewegung, Tastaturbedienung
