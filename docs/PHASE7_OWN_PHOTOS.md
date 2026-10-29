# Phase 7 – Eigene Übungsfotos

Die ehrliche Foto-Funktion aus Abschnitt 11 des Konzepts: Fotos werden aufgenommen oder ausgewählt
und **von der Nutzerin / dem Nutzer selbst** einer Übung zugeordnet. Es gibt keine automatische
Erkennung und keine vorgetäuschte KI.

## Ablauf

- Übungsseite → „Eigenes Foto“ → „Foto hinzufügen“. Auf dem iPhone bietet Safari Kamera oder
  Mediathek an. Ersetzen und Entfernen (mit Rückfrage) auf derselben Seite.
- Ein Foto pro Übung. Es erscheint auf der Übungsseite, als Vorschaubild in der Bibliothek und im
  Training („Dein Foto“). Ohne geprüftes Bibliotheksfoto ersetzt es dort die Muskelübersicht.

## Speicherung

- IndexedDB-Schema v3, neuer Store `photos` (Schlüssel: Übungs-ID). Bestehende Stores bleiben
  unverändert; der Upgrade-Test von v1 deckt v3 mit ab.
- Vor dem Speichern: auf höchstens 1280 px (lange Seite) verkleinert und neu als JPEG kodiert.
  Dabei gehen alle Metadaten verloren, auch GPS-Ortsdaten (im E2E-Test mit einem Foto mit
  EXIF/GPS geprüft).
- Fotos verlassen das Gerät nicht, außer im Backup, das man selbst herunterlädt.

## Backup

- Fotos stehen als Base64 im Feld `photos` der Backup-Datei (Schema bleibt 1, ältere Backups
  ohne Fotos funktionieren weiter). Größenlimit für Backups: 150 MB.
- Import: Fotos werden ergänzt oder durch neuere ersetzt, aber **nie gelöscht**, auch nicht im
  Modus „Ersetzen“. Beschädigte Foto-Einträge werden übersprungen und gemeldet.
- Die automatische Sicherung vor einem Import enthält keine Fotos (sie werden ja nicht gelöscht),
  damit sie klein bleibt.

## Tests

- Unit: `tests/photos.test.ts` (5 Tests).
- E2E: `e2e/photos.spec.ts` (3 Abläufe × 2 Geräte).
- Gesamt: 87 Unit-Tests, 78 E2E-Tests.

Nicht getestet: Kamera und HEIC-Fotos auf einem echten iPhone. Safari wandelt HEIC beim
Auswählen normalerweise in JPEG um; das konnte ich hier nicht prüfen.
