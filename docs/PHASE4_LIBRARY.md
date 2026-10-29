# FORM. Phase 4 – Bibliothek, Bilder, Körperkarte (29.10.2026)

## Bilder

- Quelle: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), Unlicense (gemeinfrei). Andere Quellen
  wurden nicht verwendet.
- **Jede Bildserie wurde einzeln angesehen** und mit der Übungsbeschreibung verglichen, nicht nur nach Namen zugeordnet.
  Von 43 Kandidaten wurden **37 übernommen** und **6 verworfen**, weil Gerät oder Ausführung abweichen:
  Goblet Squat (Kettlebell statt Kurzhantel), Farmer Carry (Spezialgriffe statt Hanteln), vorgebeugtes Seitheben
  (Schrägbank statt stehend), Beinrückseite dehnen (mit Partner statt Gurt), Cat-Cow (nur „Cat“), einbeinige
  Box-Kniebeuge (andere Übung).
- Die 22 bestehenden Fotos der bisherigen App wurden ebenfalls geprüft (alle passend). Beim Rumänischen Kreuzheben
  war die Reihenfolge Start/Ende vertauscht und wurde korrigiert.
- Ergebnis: **59 von 124 Übungen** mit geprüfter Bildserie. Die Zuordnung steht in `app/scripts/photo-review.json`.
- Neue Bilder sind auf 640 px verkleinert (2,5 MB statt ~6 MB). Sie liegen in `/media/exercises` und werden von der
  bisherigen App nicht verwendet.
- Ohne geprüftes Foto zeigt die App eine **beschriftete Muskelübersicht** („keine Bewegungsdemonstration“), nie das Foto
  einer anderen Übung.

## Übungsinhalte

- Für alle 124 Übungen: englischer Name und Suchbegriffe, Haupt- und Hilfsmuskeln (16 Regionen), Bewegungsmuster,
  Schwierigkeit, 3–4 Technikschritte, typische Fehler. Atmung/Tempo und passende Ziele werden einheitlich aus
  Bewegungsmuster und Übungsart abgeleitet.
- **Die Inhalte wurden für diese App geschrieben und sind nicht von einer Trainerin, einem Trainer oder einer
  Physiotherapeutin geprüft.** Die App weist darauf hin.
- Eine Dublette (`lateral_lunge` = `sidestep`) wird in der Bibliothek ausgeblendet, bleibt aber für alte Einträge
  auflösbar. IDs wurden nicht geändert.

## Körperkarte

- Body-Muscles-Atlas (Apache-2.0), wie bisher eingebunden, geschlechtsneutral, Vorder- und Rückansicht nebeneinander.
  Keine Umschaltung männlich/weiblich mehr.
- Antippbar in der Bibliothek (filtert passende Übungen), beim Anlegen eigener Übungen (Haupt → unterstützend → aus)
  und als Muskelübersicht auf Übungsseiten. Jede Region ist per Tastatur bedienbar und für Screenreader benannt.

## Bibliothek

- Eigener Tab „Übungen“: Suche (deutsch/englisch/Synonyme, ohne Akzentprobleme, mit Relevanz-Reihenfolge), Körperkarte,
  Muskelgruppen, Filter nach Equipment, Ziel, Trainingsart und Schwierigkeit.
- Übungsdetail: Fotos oder Muskelübersicht, Richtwert je Ziel, Anleitung, eigener Verlauf mit Bestleistungen,
  Alternativen, „Mit dieser Übung trainieren“.
- **Eigene Übungen** anlegen, bearbeiten, löschen. Eigene IDs kollidieren nie mit eingebauten; gelöschte eigene Übungen
  bleiben in vergangenen Trainings sichtbar. Die Messgröße bleibt fest, sobald eine Übung trainiert wurde.
- „Daten & Backup“ ist jetzt über das Symbol auf der Startseite erreichbar.

## Offline

- Bilder werden nicht mehr beim ersten Start alle auf einmal geladen, sondern im Hintergrund nachgeladen und dann
  offline bereitgehalten. Die App-Dateien selbst sind sofort offline verfügbar.

## Getestet

- 65 Unit-Tests, neu u. a.: Vollständigkeit aller Übungsinhalte, gültige Muskelregionen, jede referenzierte Bilddatei
  existiert, eindeutige Namen, Atlas deckt alle Regionen ab, Suche und Filter. Ein Test fand einen echten Fehler
  (Hilfsmuskeln wurden aus alten Daten doppelt übernommen), behoben.
- 60 Playwright-Szenarien × 2 iPhone-Profile = 120 Tests, zweifach wiederholt, ohne Ausfälle. Neu: Bibliothek mit
  Suche/Karte/Filtern, alle 59 Fotos laden, Richtwert folgt dem Ziel, eigene Übung bis Verlauf und Löschen.
- Auf dem iPhone-SE-Profil gefunden und behoben: überlappende Beschriftung im Richtwert, Muskel-Chip ragte aus der
  Karte, Auswahl auf der Körperkarte war nicht sichtbar.

## Nicht getestet / offen

- Echtes Safari auf dem iPhone (Tippen auf kleine Muskelregionen mit dem Finger).
- 65 Übungen haben weiterhin kein Foto. Mehr Abdeckung bräuchte eigene Fotos/Illustrationen oder eine Lizenz.
