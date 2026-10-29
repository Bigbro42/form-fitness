# FORM. Phase 1 – Fundament (29.10.2026)

## Ausgangslage (geprüft am Code)

- `index.html` (154 KB) plus 8 nachträglich geladene Skripte V18–V26, die sich gegenseitig überschreiben
  (`render` wird fünfmal umhüllt). Daten in `localStorage` unter 7+ Schlüsseln, kein IndexedDB.
- 124 Übungen, davon 22 mit Fotos (Free Exercise DB, Unlicense). Grobes Muskelmodell mit 7 Gruppen.
- Die alte App hatte bis V20 einen festen Wochenplan ab 01.10.2026; ab V21 einen leeren Kalender. „Jetzt trainieren“
  legt unsichtbar einen Kalendertermin „Spontanes Training“ an.
- CI auf `main` war rot: `check-release.mjs` erwartete noch die Cache-Version V20 (behoben).

## Entscheidung Architektur

Neuaufbau in `app/` mit **Vite + TypeScript + Preact** statt weiterer Patches. Preact statt React: gleiche Arbeitsweise,
aber rund 10 KB statt 45 KB – für eine iPhone-PWA spürbar. Kein Router- oder State-Framework, eigener kleiner Service Worker
statt Workbox: weniger bewegliche Teile.

## Umgesetzt

- Datenmodell mit strikter Trennung Training / Termin / Übung / Einstellungen
- IndexedDB mit Versionierung, atomaren Schreibvorgängen und automatischen Sicherungen
- Übernahme aller alten Datenformate (localStorage und alte Backup-Dateien V5/V11/V20), wiederholbar
- JSON-Backup (enthält zusätzlich die unveränderten alten Rohdaten), Import mit „Zusammenführen“ oder „Ersetzen“, CSV-Export
- Kalender-Wiederholungslogik (einmalig, täglich, wöchentlich, 2-wöchentlich, monatlich, Ausfall, Verschieben) – bisher
  nur Logik und Tests, Oberfläche folgt in Phase 3
- Oberfläche: Start, Verlauf, Trainingsdetail, Daten; dunkles Designsystem; Offline-Betrieb; Speicherschutz-Anfrage

## Getestet

- 32 Unit-Tests: Migration aller Formate inkl. kaputter Daten, Wiederholungen über Monats-/Jahresgrenzen und
  Zeitumstellung, Backup-Roundtrip, Zusammenführungsregeln, CSV
- 18 Playwright-Tests (je 9 auf iPhone-SE- und iPhone-15-Profil, Chromium): echte Bedienung der alten App → Übernahme,
  alte Daten bleiben bitgenau unverändert, Neustart, spätere Einträge, Backup auf „anderem Gerät“ wiederherstellen,
  Backup der alten App importieren, Ersetzen mit Sicherung, Fehlermeldungen, Offline, kein horizontales Überlaufen,
  keine JavaScript-Fehler

## Nicht getestet

- **Echtes Safari / iPhone:** In dieser Umgebung ist nur Chromium verfügbar. Die iPhone-Profile simulieren Größe, Touch und
  User-Agent, nicht Safaris Engine. Speicherschutz (`navigator.storage.persist`) verhält sich in Safari anders.
- **Echte Nutzerdaten:** getestet mit selbst erzeugten Daten der alten App, nicht mit deinem echten Datenbestand.
- **GitHub Pages:** noch nicht veröffentlicht (siehe offene Entscheidung).

## Offene Entscheidung: Veröffentlichung der Vorschau

Die neue App muss auf derselben Adresse laufen wie die alte (`bigbro42.github.io`), sonst kann sie deren Daten nicht lesen.
Vorschlag: GitHub Actions baut `app/` und veröffentlicht sie unter `/form-fitness/next/`, die alte App bleibt unter
`/form-fitness/`. Dafür muss in den Repository-Einstellungen unter Pages die Quelle auf „GitHub Actions“ umgestellt werden.

## Nächste Phase

Phase 2: Trainingsablauf (starten → Übung → Satz erfassen → Pause → nächste Übung → abschließen → Zusammenfassung) und
Übungsdetailseite.
