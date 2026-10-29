# FORM. Phase 5 – Fortschritt, Körper, Workout-Generator (29.10.2026)

## Körper

- Die Körperkarte (Vorder- und Rückansicht) ist in „Übungen“ jetzt von Anfang an sichtbar.
- Neu im Fortschritt: **Trainierte Muskeln** als Körperkarte für 7, 30 oder 90 Tage. Gezählt werden erfasste Sätze, in
  denen die Region Hauptmuskel ist (eine Farbskala: 0 · 1–5 · 6–11 · 12+ Sätze). Antippen zeigt die genauen Zahlen,
  unterstützende Sätze separat und die Übungen; von dort geht es direkt zu passenden Übungen. Regionen ohne Satz
  werden genannt – ausdrücklich als Übersicht, nicht als Vorwurf.

## Fortschritt (neuer Tab, ersetzt „Verlauf“; der Verlauf ist dort über „Alle Trainings“ erreichbar)

- Kennzahlen für 7/30/90 Tage: Trainings, Sätze, Zeit (Trainings ohne erfasste Dauer werden genannt, nicht geschätzt).
- Trainings pro Woche (12 Wochen) als Balkendiagramm, auch als Tabelle.
- Persönliche Rekorde und meisttrainierte Übungen.
- Pro Übung (Übungsseite): Verlauf als Liniendiagramm mit **eigener Messgröße je Übungsart**: schwerster Satz (kg) bei
  Übungen mit Last, meiste Wiederholungen bei Körpergewicht, längste Zeit bei Halteübungen, Minuten bei Cardio.
  Achsen zeigen die echten Minimal-/Maximalwerte. Es wird nichts geschätzt (z. B. kein errechnetes 1RM).
- Nur abgeschlossene Trainings zählen; Entwürfe und Termine nie.

## Workout-Generator

- Fokus (Ganzkörper, Unterkörper, Beine, Oberkörper, Drücken, Ziehen, Bauch & Core, Mobilität), Ziel, Dauer 10–60 Min.,
  verfügbares Equipment (wird gemerkt), maximale Schwierigkeit, Anzahl (automatisch aus Dauer und Ziel oder manuell).
- Aufbau nach Bewegungsmustern (z. B. Ganzkörper: Kniebeuge/Ausfallschritt, Drücken, Hüftbeuge, Ziehen, Rumpf …), keine
  gleiche Bewegung zweimal hintereinander, neue Hauptmuskeln werden bevorzugt, Übungen mit geprüftem Foto leicht bevorzugt.
- Optional „Zuletzt trainierte Muskeln schonen“ (letzte 48 h). Ein Test fand, dass diese Option zunächst wirkungslos war;
  jetzt werden Bewegungsplätze, die nur müde Muskeln treffen würden, in der ersten Runde übersprungen.
- Vorschlag bearbeiten: einzeln ersetzen (gleiches Bewegungsmuster), verschieben, entfernen, eigene Übung hinzufügen,
  alles neu mischen. Gestartet wird ein normales Training mit Quelle „Zufallstraining“ im **gemeinsamen Verlauf**.
- Hinweis, wenn das Equipment für den Fokus nicht reicht.
- Datenkorrektur: „Aktives Hängen an Stange“ benötigt jetzt das neue Equipment „Klimmzugstange“ statt „Ohne Equipment“.

## Getestet

- 75 Unit-Tests (neu: Wochen-Buckets, Summen, Muskelbelastung, Messgröße je Übungsart, Rekorde; Generator mit 25 festen
  Zufallswerten: Ausgewogenheit, nur verfügbares Equipment, Fokus/Ziel, Schonung, Ersetzen).
- 68 Playwright-Szenarien × 2 iPhone-Profile = 136 Tests, zweifach wiederholt ohne Ausfälle.
- Gefunden und behoben: überlappende Datumsbeschriftung, gepolsterte statt echter Achsenwerte, Wertanzeige sprang bei
  stehendem Mauszeiger auf eine zufällige Woche.

## Nicht getestet / offen

- Echtes Safari auf dem iPhone.
- Belastung/Erholung wird nur über erfasste Sätze und die subjektive Belastung (RPE) dokumentiert; es gibt bewusst keine
  erfundene „Erholungsquote“.
