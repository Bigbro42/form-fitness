import { getKv, mergeUserData, saveSnapshot, setKv, type Db, type LegacyImportState } from '../db/db';
import { newId } from '../domain/ids';
import { convertLegacy, inputFromStorage, LEGACY_KEYS } from './convert';

export type RawLegacy = Partial<Record<(typeof LEGACY_KEYS)[number], string>>;

/** Copies the legacy values out of localStorage. Never writes or removes anything. */
export function readLegacyStorage(storage: Pick<Storage, 'getItem'>): RawLegacy {
  const raw: RawLegacy = {};
  for (const key of LEGACY_KEYS) {
    const value = storage.getItem(key);
    if (value !== null) raw[key] = value;
  }
  return raw;
}

/** FNV-1a over the raw values; only used to notice that the legacy data changed. */
export function hashLegacy(raw: RawLegacy): string {
  const text = LEGACY_KEYS.map((k) => `${k}=${raw[k] ?? ''}`).join('\u0000');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + ':' + text.length;
}

/** Only these keys hold training data; rest timer settings alone are not worth an import. */
const DATA_KEYS = ['form-coach-v5', 'form-trainingscoach-v4', 'form-trainingscoach-v3', 'form-trainingscoach-v2', 'form-trainingscoach-v1', 'form-random-workouts-v1', 'form-calendar-v20'] as const;

export type MigrationResult =
  | { status: 'none' }
  | { status: 'unchanged'; state: LegacyImportState }
  | { status: 'imported'; state: LegacyImportState; firstImport: boolean };

/**
 * Imports legacy data when it is new or changed since the last import (the legacy app may
 * still be used in parallel). Order: raw snapshot first, then one atomic merge. Records the
 * user already edited in the new app are kept.
 */
export async function runLegacyMigration(db: Db, storage: Pick<Storage, 'getItem'>, now = new Date()): Promise<MigrationResult> {
  const raw = readLegacyStorage(storage);
  if (!DATA_KEYS.some((k) => raw[k] !== undefined)) return { status: 'none' };
  const hash = hashLegacy(raw);
  const previous = await getKv(db, 'legacyImport');
  if (previous?.hash === hash) return { status: 'unchanged', state: previous };

  await saveSnapshot(db, {
    id: newId('snap'),
    takenAt: now.toISOString(),
    kind: 'legacy-storage',
    reason: previous ? 'Änderungen aus der bisherigen App' : 'Erste Übernahme aus der bisherigen App',
    payload: JSON.stringify(raw),
  });
  const problems: string[] = [];
  const result = convertLegacy(inputFromStorage(raw, problems), { now });
  result.report.problems.unshift(...problems);
  const state: LegacyImportState = { hash, importedAt: now.toISOString(), report: result.report, outcome: { added: 0, updated: 0, keptLocal: 0 } };
  state.outcome = await mergeUserData(db, result, 'refresh');
  // Written last: if the app is closed in between, the (idempotent) import simply runs again.
  await setKv(db, 'legacyImport', state);
  return { status: 'imported', state, firstImport: !previous };
}
