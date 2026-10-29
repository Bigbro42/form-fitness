import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, importBackup, parseBackup, sessionsToCsv, BackupError } from '../src/backup/backup';
import { listSnapshots, openFormDb, readUserData, type Db } from '../src/db/db';
import { runLegacyMigration } from '../src/legacy/migrate';
import { calendarV20, coachV5, legacyStorage, MemoryStorage, NOW, randomV1 } from './fixtures';

let db: Db;
let n = 0;
beforeEach(async () => {
  db = await openFormDb(`test-${++n}`);
});
afterEach(() => db.close());

describe('legacy migration', () => {
  it('does nothing for a new user', async () => {
    expect(await runLegacyMigration(db, new MemoryStorage({}), NOW)).toEqual({ status: 'none' });
    expect((await readUserData(db)).sessions).toEqual([]);
    expect((await readUserData(db)).plans).toEqual([]);
  });

  it('imports once, keeps a raw snapshot and never writes to localStorage', async () => {
    const storage = new MemoryStorage(legacyStorage());
    const before = storage.snapshot();
    const first = await runLegacyMigration(db, storage, NOW);
    expect(first.status).toBe('imported');
    const data = await readUserData(db);
    expect(data.sessions.filter((s) => s.status === 'completed')).toHaveLength(4);
    expect(data.plans).toHaveLength(4);
    expect(data.settings.primaryGoal).toBe('strength');
    const snaps = await listSnapshots(db);
    expect(snaps).toHaveLength(1);
    expect(JSON.parse(snaps[0]!.payload)).toEqual(before);
    expect(storage.writes).toBe(0);
    expect(storage.snapshot()).toEqual(before);
    expect((await runLegacyMigration(db, storage, NOW)).status).toBe('unchanged');
  });

  it('picks up new legacy data but keeps workouts edited in the new app', async () => {
    const storage = new MemoryStorage(legacyStorage());
    await runLegacyMigration(db, storage, NOW);
    // The user edits one imported workout in the new app.
    const edited = (await db.get('sessions', 'legacy-day-2026-10-05'))!;
    await db.put('sessions', { ...edited, note: 'Neu notiert', rev: 1 });
    // Meanwhile the legacy app is used again: a new workout and a change to the edited one.
    const records = { ...coachV5.records, '2026-10-27': { complete: true }, '2026-10-05': { ...coachV5.records['2026-10-05'], note: 'alt geändert' } };
    const changed = new MemoryStorage(legacyStorage({ 'form-coach-v5': { ...coachV5, records } }));
    const result = await runLegacyMigration(db, changed, NOW);
    expect(result.status).toBe('imported');
    if (result.status !== 'imported') return;
    expect(result.firstImport).toBe(false);
    expect(result.state.outcome.added).toBe(1);
    expect(result.state.outcome.keptLocal).toBe(1);
    expect((await db.get('sessions', 'legacy-day-2026-10-05'))!.note).toBe('Neu notiert');
    expect(await db.get('sessions', 'legacy-day-2026-10-27')).toBeDefined();
    expect(await listSnapshots(db)).toHaveLength(2);
  });
});

describe('backups', () => {
  it('round-trips everything through a backup file', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage()), NOW);
    const backup = await createBackup(db, NOW);
    expect(backup.legacyRaw?.['form-coach-v5']).toBeDefined();
    const text = JSON.stringify(backup);

    const other = await openFormDb(`test-${++n}`);
    const parsed = parseBackup(text, 'backup.json', NOW);
    expect(parsed.kind).toBe('form');
    await importBackup(other, parsed, 'replace', 'backup.json', NOW);
    expect(await readUserData(other)).toEqual(await readUserData(db));
    other.close();
  });

  it('takes a snapshot of the current data before importing', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage()), NOW);
    const parsed = parseBackup(JSON.stringify({ version: 11, records: { '2026-09-01': { complete: true } }, plans: {} }), 'alt.json', NOW);
    await importBackup(db, parsed, 'replace', 'alt.json', NOW);
    const snap = (await listSnapshots(db)).find((s) => s.kind === 'user-data')!;
    expect(snap.reason).toContain('alt.json');
    expect(JSON.parse(snap.payload).data.sessions.length).toBeGreaterThan(3);
    expect((await readUserData(db)).sessions.map((s) => s.id)).toEqual(['legacy-day-2026-09-01']);
  });

  it('never lets an older legacy backup overwrite current data when merging', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage()), NOW);
    const oldRecords = { '2026-10-05': { complete: true, completedExercises: [{ id: 'squat', sets: [5], weights: [], done: [] }] }, '2026-09-28': { complete: true } };
    const parsed = parseBackup(JSON.stringify({ version: 20, records: oldRecords, plans: {}, randomSessions: [], scheduleV20: calendarV20 }), 'alt.json', NOW);
    const outcome = await importBackup(db, parsed, 'merge', 'alt.json', NOW);
    expect(outcome.added).toBe(1);
    const kept = (await db.get('sessions', 'legacy-day-2026-10-05'))!;
    expect(kept.exercises[0]!.sets.map((s) => s.value)).toEqual([12, 10]);
  });

  it('merges FORM. backups by keeping the newer version', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage()), NOW);
    const backup = await createBackup(db, NOW);
    const session = backup.data.sessions.find((s) => s.id === 'legacy-day-2026-10-05')!;
    session.note = 'aus dem Backup';
    session.updatedAt = '2030-01-01T00:00:00.000Z';
    session.rev = 3;
    const other = backup.data.sessions.find((s) => s.id === 'legacy-day-2026-10-06')!;
    other.note = 'älter';
    other.updatedAt = '2000-01-01T00:00:00.000Z';
    await importBackup(db, parseBackup(JSON.stringify(backup), 'b.json', NOW), 'merge', 'b.json', NOW);
    expect((await db.get('sessions', 'legacy-day-2026-10-05'))!.note).toBe('aus dem Backup');
    expect((await db.get('sessions', 'legacy-day-2026-10-06'))!.note).toBe('');
  });

  it('rejects invalid files with understandable messages', () => {
    expect(() => parseBackup('{', 'x.json')).toThrow(BackupError);
    expect(() => parseBackup('{"hello":1}', 'x.json')).toThrow('kein FORM.-Backup');
    expect(() => parseBackup(JSON.stringify({ format: 'form-backup', schemaVersion: 99, data: {} }), 'x.json')).toThrow('neueren');
  });

  it('skips single broken entries of a FORM. backup but imports the rest', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage()), NOW);
    const backup = await createBackup(db, NOW);
    (backup.data.sessions as unknown[]).push({ id: 'kaputt', date: 'nie' });
    const parsed = parseBackup(JSON.stringify(backup), 'b.json');
    expect(parsed.kind === 'form' && parsed.skipped).toEqual(['Training #' + backup.data.sessions.length]);
  });

  it('exports one CSV row per set with the right unit columns', async () => {
    await runLegacyMigration(db, new MemoryStorage(legacyStorage({ 'form-random-workouts-v1': randomV1 })), NOW);
    const csv = sessionsToCsv((await readUserData(db)).sessions);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Datum;Training;Status;Quelle;Übung;Übungs-ID;Variante;Satz;Wiederholungen;Sekunden;Minuten;Gewicht (kg);Abgehakt;Dauer (Min.);Belastung (RPE);Notiz');
    expect(lines).toContain('2026-10-05;Beine & Core;Abgeschlossen;Kalender;Plank;plank;easy;1;;30;;;Ja;22;;Gut gelaufen');
    expect(lines.some((l) => l.startsWith('2026-10-12;Beine & Core;Nicht abgeschlossen;Kalender;Kurzhantel-Bankdrücken;hexbpress;standard;1;8;;;12.5;Ja'))).toBe(true);
  });
});
