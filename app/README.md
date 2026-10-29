# FORM. (neue App)

Neuaufbau der FORM.-PWA mit Vite, TypeScript und Preact. Die bisherige App im Repository-Root bleibt
unverändert live, bis die neue App sie vollständig ersetzt.

## Befehle

```bash
npm ci
npm run dev          # Entwicklung, http://localhost:5173
npm run typecheck
npm test             # Unit-Tests (Vitest, IndexedDB via fake-indexeddb)
npm run build        # dist/ inkl. Service Worker und Übungsfotos
npm run test:e2e     # Playwright gegen dist/ + bisherige App auf demselben Origin
npm run release      # Build nach /next kopieren (wird von GitHub Pages veröffentlicht)
```

## Veröffentlichung

GitHub Pages veröffentlicht den Root von `main`. Die gebaute App liegt eingecheckt in `/next`
und ist damit unter `https://bigbro42.github.io/form-fitness/next/` erreichbar; die bisherige
App unter `/form-fitness/` bleibt unverändert. Nach jeder Änderung `npm run release` ausführen
und `next/` mit committen – die CI (`scripts/check-next.mjs`) schlägt sonst fehl.
`E2E_PUBLISHED=1 npm run test:e2e` testet genau die veröffentlichte Ordnerstruktur.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/domain` | Datenmodell (`types.ts`), Übungskatalog, Datum, Kalender-Wiederholungen |
| `src/legacy` | Übernahme der Daten der bisherigen App (reine Funktionen + Migrationslauf) |
| `src/db` | IndexedDB-Schema, Lesen/Zusammenführen, automatische Sicherungen |
| `src/backup` | JSON-Backup (Export/Import, auch alte Backups), CSV-Export |
| `src/state` | App-Start, Speicherschutz, globaler Zustand |
| `src/ui` | Designsystem (`styles.css`), Komponenten, Bildschirme |
| `src/data/legacy-catalog.json` | Die 124 Übungen exakt so, wie die bisherige App sie zur Laufzeit erzeugt (`npm run extract:legacy`) |

## Grundregeln der Daten

- **Training ≠ Termin.** `WorkoutSession` ist etwas, das tatsächlich gemacht wurde. Nur `status: "completed"` zählt
  als Training. `PlannedWorkout` ist ein Kalendereintrag (einmalig oder wiederkehrend) und zählt nie als Training.
- **Historie ist unabhängig.** Jede Einheit speichert Name und Messgröße jeder Übung als Kopie. Spätere Änderungen an
  Bibliothek oder Vorlagen verändern abgeschlossene Trainings nicht.
- **Stabile IDs.** Übungs-IDs der bisherigen App bleiben unverändert. Übernommene Einträge erhalten abgeleitete IDs
  (`legacy-day-<Datum>`, `legacy-random-<id>`, `legacy-plan-<id>`), damit dieselben Daten aus localStorage und aus einer
  Backup-Datei nie doppelt entstehen.
- **Nichts wird gelöscht.** Die alten localStorage-Schlüssel werden nur gelesen. Vor jeder Übernahme und jedem Import wird
  der vorherige Stand als Sicherung in IndexedDB abgelegt.

## Übernahme aus der bisherigen App

Gelesen werden `form-coach-v5` (sonst `form-trainingscoach-v4…v1`), `form-random-workouts-v1`, `form-calendar-v20`,
`form-rest-length` und `form-rest-auto`. Details stehen im Kopf von `src/legacy/convert.ts`. Wichtigste Regeln:

- Abgeschlossen ist nur, was die alte App mit `complete: true` markiert hat.
- Begonnene, nie abgeschlossene Einheiten werden als „Nicht abgeschlossen“ übernommen und zählen nicht.
- Einträge ganz ohne Eingaben (z. B. ein nie begonnenes Zufallstraining) werden nicht übernommen, bleiben aber im
  Rohdaten-Archiv.
- „Jetzt trainieren“-Termine (`quick-…`) sind keine Planung und werden nicht zu Kalenderterminen.
- Was die alte App nicht gespeichert hat (z. B. Uhrzeit des Abschlusses), wird ergänzt und als ergänzt markiert.
- Wird die bisherige App weiter benutzt, übernimmt die neue App neue Einträge beim nächsten Start. Einträge, die in der
  neuen App bearbeitet wurden, werden dabei nicht überschrieben.
- Die alten Erinnerungsvorlagen (`form-pwa-reminders`) und die frühere Geschlechtswahl werden nicht übernommen, bleiben
  aber im Rohdaten-Archiv und im Backup.
