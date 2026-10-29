# FORM. Phase 2 – Trainingsablauf (29.10.2026)

## Umgesetzt

**Ablauf:** Training starten → Übung hinzufügen → Sätze erfassen → Pause → nächste Übung → abschließen →
Zusammenfassung → Verlauf.

- **Start ohne Plan:** „Training starten“ auf Start oder im Tab „Training“. Läuft schon ein Training, geht es dorthin
  zurück (es gibt immer höchstens eines).
- **Übungsauswahl:** Suche (mit Relevanz-Reihenfolge, ohne Akzente/ß-Probleme), Filter nach Muskelgruppe und Equipment,
  „Zuletzt verwendet“ oben.
- **Übungsseite** in der gewünschten Reihenfolge: Name/Muskeln/Ziel → Richtwert → Foto oder klar beschriftete
  Muskelübersicht → Satzeingabe → letztes Training und Bestleistung → „Vorherige Werte“ → Abhaken mit Pausentimer →
  aufklappbare Technik & Varianten → Nächste Übung / Übersicht. Die Tab-Leiste ist dort ausgeblendet, damit mehr Platz
  für die Eingabe bleibt und die wichtigsten Knöpfe unten mit dem Daumen erreichbar sind.
- **Satzeingabe:** große Felder, iPhone-Zahlentastatur, Komma oder Punkt, jede Eingabe wird sofort gespeichert.
  Werte des letzten Trainings stehen grau als Platzhalter; Abhaken eines leeren Satzes übernimmt sie, ohne Wert wird
  nichts abgehakt. Sätze hinzufügen/entfernen; neue Sätze übernehmen das Gewicht des vorherigen.
- **Übungen** ersetzen, verschieben und entfernen (mit Rückfrage); Variante leichter/standard/schwerer.
- **Pausentimer** startet beim Abhaken (abschaltbar über Einstellung `restAuto`), Dauer = unterer Richtwert des Ziels,
  ±15 s, bleibt über alle Trainingsbildschirme sichtbar.
- **Abschluss:** Dauer (automatisch gemessen, änderbar), Belastung 1–10 (optional), Notiz. Warnung, wenn keine Sätze
  erfasst wurden.
- **Zusammenfassung:** Dauer, Übungen, Sätze, bewegtes Gewicht (nur kg × Wdh., nicht für Zeit/Körpergewicht),
  neue Bestleistungen. Ein erstes Mal gilt bewusst nicht als „Rekord“.
- **Geschützte Trainings:** Abgeschlossene Einheiten lassen sich nur über „Korrigieren“ (mit Rückfrage) ändern; Datum,
  Abschlusszeit und Dauer bleiben erhalten; „Korrektur verwerfen“ stellt den alten Stand exakt wieder her.
- **Ohne Abschluss beenden:** leere Trainings werden verworfen, sonst als „Nicht abgeschlossen“ behalten (zählen nicht)
  und lassen sich fortsetzen – auch nicht abgeschlossene Einträge aus der bisherigen App.

## Richtwerte

`src/domain/recommendations.ts`: abhängig von Ziel (9 Ziele) und Übungsart (Wiederholungen, Halten, Mobilität, Cardio).
Orientierung an ACSM-Positionspapieren und Meta-Analysen zu Last und Hypertrophie: Muskelaufbau in einem breiten
Wiederholungsbereich nahe an der Ausbelastung, Maximalkraft mit schweren Lasten und langen Pausen, Kraftausdauer mit
mehr Wiederholungen und kurzen Pausen, Cardio über Zeit und Intensität, Mobilität über kontrollierte Bewegung.
Es werden **keine Kilogramm vorgegeben**; Gewichtshinweise beziehen sich nur auf die eigenen früheren Sätze. Alle Werte
sind als „Richtwert“ beschriftet. Sie sind nicht fachlich durch eine Trainerin oder einen Trainer geprüft.

## Getestet

- 46 Unit-Tests (neu: Trainingslogik, Schutz abgeschlossener Trainings, Korrektur/Verwerfen, Historie,
  Bestleistungen, Volumen, Richtwerte)
- 32 Playwright-Szenarien × 2 iPhone-Profile = 64 Tests, zusätzlich zweifach wiederholt ohne Ausfälle (Chromium).
  Neu: kompletter Ablauf, Autosave über Neustart, zweites Training mit Vorwerten und Rekord, Korrektur/Verwerfen,
  Beenden ohne Abschluss und Fortsetzen, Ersetzen/Verschieben/Entfernen, Muskelübersicht ohne Foto,
  kleine Bildschirme (kg vollständig sichtbar, nichts unter dem Timer).

## Behobene Fehler aus dieser Phase

- App blieb bei schnellem Start (z. B. offline aus dem Cache) im Ladebildschirm hängen – Ursache gefunden und behoben.
- Start wartete auf die Speicherschutz-Anfrage des Browsers.
- Filterleiste und kg-Feld waren auf 320 px zu schmal.

## Nicht getestet / offen

- Echtes Safari auf dem iPhone (Tastatur, Vibration – iOS-Safari unterstützt `navigator.vibrate` nicht, der Timer zeigt
  das Ende daher nur optisch an; Bildschirm-Sperre während der Pause).
- Technikanleitungen bestehen weiterhin nur aus einem Hinweis pro Übung aus der bisherigen App (Phase 4).
- Kalender (Phase 3), Bibliothek/Bilder/Körperkarte (Phase 4), Randomizer und Fortschritt (Phase 5).
