import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS, type ExerciseDef, type PlannedWorkout, type Settings, type UserData, type WorkoutSession } from '../domain/types';

export const DB_NAME = 'form';
export const DB_VERSION = 1;

export type SnapshotKind = 'legacy-storage' | 'user-data';

export interface Snapshot {
  id: string;
  takenAt: string;
  kind: SnapshotKind;
  /** Why it was taken, shown to the user. */
  reason: string;
  /** JSON text: raw legacy localStorage values or a full FORM. backup. */
  payload: string;
}

export interface LegacyImportState {
  hash: string;
  importedAt: string;
  report: import('../legacy/convert').ConversionReport;
  outcome: MergeOutcome;
}

export interface MergeOutcome {
  added: number;
  updated: number;
  /** Records the user changed in the new app; the incoming version was not applied. */
  keptLocal: number;
}

interface KvValues {
  settings: Settings;
  legacyImport: LegacyImportState;
}

interface FormDB extends DBSchema {
  sessions: { key: string; value: WorkoutSession; indexes: { date: string } };
  plans: { key: string; value: PlannedWorkout };
  exercises: { key: string; value: ExerciseDef };
  snapshots: { key: string; value: Snapshot; indexes: { takenAt: string } };
  kv: { key: keyof KvValues; value: KvValues[keyof KvValues] };
}

export type Db = IDBPDatabase<FormDB>;

export function openFormDb(name = DB_NAME): Promise<Db> {
  return openDB<FormDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Future schema versions add `if (oldVersion < N)` steps; existing stores are never dropped.
      if (oldVersion < 1) {
        db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('date', 'date');
        db.createObjectStore('plans', { keyPath: 'id' });
        db.createObjectStore('exercises', { keyPath: 'id' });
        db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('takenAt', 'takenAt');
        db.createObjectStore('kv');
      }
    },
    blocking() {
      // Another tab wants a newer schema: let it, this tab reloads into the new version.
      location.reload();
    },
  });
}

export async function getKv<K extends keyof KvValues>(db: Db, key: K): Promise<KvValues[K] | undefined> {
  return (await db.get('kv', key)) as KvValues[K] | undefined;
}

export async function setKv<K extends keyof KvValues>(db: Db, key: K, value: KvValues[K]): Promise<void> {
  await db.put('kv', value, key);
}

export async function readUserData(db: Db): Promise<UserData> {
  const tx = db.transaction(['sessions', 'plans', 'exercises', 'kv'], 'readonly');
  const [sessions, plans, customExercises, settings] = await Promise.all([
    tx.objectStore('sessions').getAll(),
    tx.objectStore('plans').getAll(),
    tx.objectStore('exercises').getAll(),
    tx.objectStore('kv').get('settings') as Promise<Settings | undefined>,
  ]);
  await tx.done;
  sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return { sessions, plans, customExercises, settings: { ...DEFAULT_SETTINGS, ...settings } };
}

interface Revisioned {
  id: string;
  rev: number;
  updatedAt: string;
}

/**
 * How incoming records treat records that already exist with the same id:
 * - refresh:     live legacy re-import. Untouched imports (rev 0) are refreshed; anything the
 *                user edited in the new app (rev > 0) is kept.
 * - newer-wins:  FORM. backup merge. The more recently updated version wins.
 * - add-missing: legacy backup file. Only new records are added; a possibly older file never
 *                overwrites what is already here.
 * - replace:     the stores were emptied first; everything incoming is written.
 */
export type MergePolicy = 'refresh' | 'newer-wins' | 'add-missing' | 'replace';

function incomingWins(policy: MergePolicy, existing: Revisioned, item: Revisioned): boolean {
  switch (policy) {
    case 'replace': return true;
    case 'refresh': return existing.rev === 0;
    case 'newer-wins': return item.updatedAt > existing.updatedAt;
    case 'add-missing': return false;
  }
}

async function mergeInto<T extends Revisioned>(store: { get(id: string): Promise<T | undefined>; put(v: T): Promise<unknown> }, items: T[], policy: MergePolicy, out: MergeOutcome) {
  for (const item of items) {
    const existing = await store.get(item.id);
    if (!existing) {
      await store.put(item);
      out.added++;
    } else if (JSON.stringify(existing) === JSON.stringify(item)) {
      // identical, nothing to do
    } else if (incomingWins(policy, existing, item)) {
      await store.put(item);
      out.updated++;
    } else {
      out.keptLocal++;
    }
  }
}

export interface MergeInput {
  sessions: WorkoutSession[];
  plans: PlannedWorkout[];
  customExercises?: ExerciseDef[];
  settings?: Partial<Settings>;
}

/**
 * Writes incoming data in one transaction: either everything is stored or nothing.
 * `replace` empties the user stores first (callers take a snapshot before).
 */
export async function mergeUserData(db: Db, input: MergeInput, policy: MergePolicy): Promise<MergeOutcome> {
  const out: MergeOutcome = { added: 0, updated: 0, keptLocal: 0 };
  const tx = db.transaction(['sessions', 'plans', 'exercises', 'kv'], 'readwrite');
  const overwrite = policy === 'replace';
  if (overwrite) {
    await Promise.all([tx.objectStore('sessions').clear(), tx.objectStore('plans').clear(), tx.objectStore('exercises').clear()]);
  }
  await mergeInto(tx.objectStore('sessions'), input.sessions, policy, out);
  await mergeInto(tx.objectStore('plans'), input.plans, policy, out);
  for (const x of input.customExercises ?? []) {
    // Custom exercises are only ever added; an id that exists already keeps its definition.
    if (overwrite || !(await tx.objectStore('exercises').get(x.id))) await tx.objectStore('exercises').put(x);
  }
  if (input.settings && Object.keys(input.settings).length) {
    const kv = tx.objectStore('kv');
    const current = { ...DEFAULT_SETTINGS, ...((await kv.get('settings')) as Settings | undefined) };
    // Settings the user already changed in the new app are never overwritten by a merge.
    const userTouched = current.updatedAt !== DEFAULT_SETTINGS.updatedAt;
    if (overwrite) await kv.put({ ...DEFAULT_SETTINGS, ...input.settings }, 'settings');
    else if (!userTouched) await kv.put({ ...current, ...input.settings, updatedAt: current.updatedAt }, 'settings');
  }
  await tx.done;
  return out;
}

export async function saveSnapshot(db: Db, snapshot: Snapshot, keepPerKind = 10): Promise<void> {
  const tx = db.transaction('snapshots', 'readwrite');
  await tx.store.put(snapshot);
  const all = (await tx.store.index('takenAt').getAll()).filter((s) => s.kind === snapshot.kind);
  // Keep the very first snapshot of each kind (the original state) plus the newest ones.
  const removable = all.slice(1, Math.max(1, all.length - keepPerKind + 1));
  for (const s of removable) await tx.store.delete(s.id);
  await tx.done;
}

export async function listSnapshots(db: Db): Promise<Snapshot[]> {
  return (await db.getAllFromIndex('snapshots', 'takenAt')).reverse();
}
