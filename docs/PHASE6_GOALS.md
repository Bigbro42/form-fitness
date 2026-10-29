# Phase 6 – Langfristige Ziele und Vorgaben

Umsetzung von Abschnitt 4 des Konzepts: zwei unabhängige Ebenen.

## A. Langfristiges Ziel (neu: Einstellungen, `#/einstellungen`)

- Ein Hauptziel aus den neun Zielen (oder „noch kein festes Ziel“) und bis zu zwei Nebenziele.
- Nebenziele wiederholen nie das Hauptziel; ohne Hauptziel gibt es keine Nebenziele
  (`normalizeGoals` in `src/domain/goals.ts`).
- Außerdem: Trainingsniveau, übliche Trainingsdauer (10–60 Min.), verfügbares Equipment,
  automatische Satzpause. Jede Änderung wird sofort gespeichert.
- Erreichbar über das Zahnrad und die Zielkarte auf der Startseite.

## B. Ziel pro Einheit (unverändert vorhanden)

Jedes Training, jeder Termin und der Generator haben ein eigenes Ziel. Das Hauptziel ist nur die
Vorauswahl; eine Cardio-Einheit trotz Hauptziel Muskelaufbau ändert die Einstellungen nicht.

## Was die Ziele beeinflussen

- Vorauswahl bei neuen Trainings, Terminen, auf der Übungsseite und im Generator.
- Richtwerte (Sätze, Wiederholungen/Dauer, Anstrengung, Pausen) über das Ziel der Einheit.
- In jeder Zielauswahl stehen die eigenen Ziele oben („Deine Ziele“, markiert als Haupt- bzw.
  Nebenziel), im Übungsfilter zuerst.
- Generator: Niveau und Dauer kommen aus den Einstellungen.
- Der Kalender wird nie automatisch befüllt.

Nebenziele verändern keine Richtwerte direkt: Richtwerte hängen am Ziel der jeweiligen Einheit.
Das ist Absicht – eine Mischung zweier Zielvorgaben in einer Einheit wäre nicht evidenzbasiert
begründbar.

## Robustheit

`normalizeSettings` (`src/domain/settings.ts`) repariert Einstellungen aus älteren Versionen,
Backups und der bisherigen App beim Laden und Speichern, statt die App zu blockieren.

## Tests

- Unit: `tests/settings.test.ts` (7 Tests).
- E2E: `e2e/settings.spec.ts` (2 Abläufe × 2 Geräte).
- Gesamt: 82 Unit-Tests, 72 E2E-Tests (36 Abläufe × iPhone SE und iPhone 15).

Nebenbei behoben: Silbentrennung in den Überblick-Kacheln („abge-schlossen“ statt „abgeschlo|ssen“).
Nicht getestet: echtes Safari auf dem iPhone.
