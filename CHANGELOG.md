# Changelog

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
