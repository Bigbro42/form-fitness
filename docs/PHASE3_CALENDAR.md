# FORM. Phase 3 – Kalender (29.10.2026)

## Umgesetzt

- **Leerer Start:** Der Kalender enthält nur, was du selbst planst. Geplante Termine zählen nie als Training; ein
  Termin gilt erst als „Absolviert“, wenn ein abgeschlossenes Training zu ihm gehört.
- **Monatsansicht** (Montag zuerst) mit Markierungen: absolviert (gefüllt), geplant (Ring), begonnen (orange),
  nicht erledigt (grauer Ring). Tagesansicht mit allen Terminen und Trainings des Tages.
- **Planen:** einmalig, jede Woche, alle 2 Wochen, jeden Monat; optional Uhrzeit, Enddatum, Ziel und Übungen mit
  Satzanzahl. „Sport / Kurs“ für Termine ohne Übungen (z. B. Kampfsport). Monatliche Serien am 29.–31. entfallen in
  kürzeren Monaten (wird beim Planen angezeigt).
- **Einzelne Termine:** auslassen und wiederherstellen, verschieben (auch in einen anderen Monat), „Nur diesen ändern“
  (die Serie bleibt unverändert; Änderung zurücknehmbar), einmalige Termine löschen.
- **Ganze Serie:** bearbeiten, „Ab hier beenden“, löschen. Absolvierte Trainings bleiben immer im Verlauf.
- **Training aus Termin:** startet mit den geplanten Übungen und dem Ziel, am tatsächlichen Trainingstag. Start zeigt
  „Heute geplant“ und „Als Nächstes“.
- **Vorlagen:** Training als Vorlage speichern, im Planen-Formular verwenden, verwalten. „Erneut trainieren“
  dupliziert ein Training (gleiche Übungen und Satzanzahl, leere Werte, letzte Werte als Hinweis).
- **Daten:** IndexedDB-Schema Version 2 (neuer Speicher für Vorlagen). Das Upgrade lässt bestehende Daten unverändert
  (Unit-Test mit echter Version-1-Datenbank). Backups enthalten Vorlagen; ältere Backups ohne Vorlagen bleiben gültig.
  Kalender der bisherigen App (Serien, Ausfälle, Uhrzeiten) erscheinen mit ihren Wiederholungen.

## Getestet

- 56 Unit-Tests (neu: Kalenderoperationen, Agenda-Status, Monatsraster, Vorlagen, Datenbank-Upgrade)
- 52 Playwright-Szenarien × 2 iPhone-Profile = 104 Tests, zweifach wiederholt ohne Ausfälle. Neu: leerer Kalender,
  Serie über Monats- und Jahresgrenzen, geplant ≠ absolviert, Training aus Termin bis „Absolviert“, Auslassen /
  Wiederherstellen / Verschieben / Nur-diesen-ändern, Serie bearbeiten / ab hier beenden / löschen ohne
  Verlauf-Verlust, Monatsende-Regel, Vorlagen, Kalender aus der bisherigen App. Feste Testzeit (29.10.2026),
  damit die Tests an jedem Tag gleich laufen.
- Gegenprobe: Ein absichtlich eingebauter Fehler („absolviert“ wird nicht erkannt) wird von den Tests gefunden.

## Nicht getestet / offen

- Echtes Safari auf dem iPhone (u. a. native Datums- und Uhrzeitauswahl).
- Keine Erinnerungen/Benachrichtigungen (eine Web-App auf GitHub Pages kann ohne Server keine verlässlichen
  Push-Erinnerungen senden; ein Kalender-Export als .ics wäre eine mögliche Ergänzung).
