import { useEffect, useState } from 'preact/hooks';
import { deletePhoto, getKv, listPhotos, listSnapshots, openFormDb, putPhoto, readUserData, type Db, type ExercisePhoto, type LegacyImportState, type Snapshot } from '../db/db';
import { normalizeSettings } from '../domain/settings';
import { DEFAULT_SETTINGS, type ExerciseDef, type PlannedWorkout, type Settings, type UserData, type WorkoutSession, type WorkoutTemplate } from '../domain/types';
import { runLegacyMigration, type MigrationResult } from '../legacy/migrate';

export type PersistState = 'persisted' | 'not-persisted' | 'unsupported';

export interface AppState {
  phase: 'loading' | 'ready' | 'error';
  error: string | null;
  data: UserData;
  legacy: LegacyImportState | null;
  /** Result of the migration run at this start (for the one-time notice). */
  migration: MigrationResult | null;
  snapshots: Snapshot[];
  persist: PersistState;
  /** Running rest timer, if any. */
  rest: { endsAt: number; total: number } | null;
  /** Own exercise photos: exercise id → object URL. */
  photos: Record<string, string>;
}

let db: Db | null = null;
let state: AppState = {
  phase: 'loading',
  error: null,
  data: { sessions: [], plans: [], templates: [], customExercises: [], settings: DEFAULT_SETTINGS },
  legacy: null,
  migration: null,
  snapshots: [],
  persist: 'unsupported',
  rest: null,
  photos: {},
};
const listeners = new Set<() => void>();

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function getDb(): Db {
  if (!db) throw new Error('Datenbank ist noch nicht geöffnet.');
  return db;
}

export function useAppState(): AppState {
  const [, force] = useState(0);
  const rendered = state;
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    // The state may have changed between render and subscription (e.g. a fast start from cache).
    if (rendered !== state) l();
    return () => void listeners.delete(l);
  }, []);
  return state;
}

/** Re-reads everything from IndexedDB after a write. */
export async function refresh(): Promise<void> {
  const d = getDb();
  const [data, legacy, snapshots, photos] = await Promise.all([readUserData(d), getKv(d, 'legacyImport'), listSnapshots(d), listPhotos(d)]);
  for (const url of Object.values(state.photos)) URL.revokeObjectURL(url);
  set({ data, legacy: legacy ?? null, snapshots, photos: Object.fromEntries(photos.map((p) => [p.exerciseId, URL.createObjectURL(p.blob)])) });
}

/** Stores the user's own photo for an exercise (replaces an existing one). */
export async function saveExercisePhoto(photo: ExercisePhoto): Promise<void> {
  await putPhoto(getDb(), photo);
  const old = state.photos[photo.exerciseId];
  if (old) URL.revokeObjectURL(old);
  set({ photos: { ...state.photos, [photo.exerciseId]: URL.createObjectURL(photo.blob) } });
}

export async function removeExercisePhoto(exerciseId: string): Promise<void> {
  await deletePhoto(getDb(), exerciseId);
  const { [exerciseId]: old, ...rest } = state.photos;
  if (old) URL.revokeObjectURL(old);
  set({ photos: rest });
}

async function persistState(request: boolean): Promise<PersistState> {
  const storage = navigator.storage;
  if (!storage?.persisted) return 'unsupported';
  if (await storage.persisted()) return 'persisted';
  // Ask the browser to protect our data from automatic eviction (important on iOS Safari).
  if (request && storage.persist && (await storage.persist())) return 'persisted';
  return 'not-persisted';
}

function readableError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'InvalidStateError' || name === 'SecurityError') {
    return 'Dieser Browser erlaubt hier keine lokale Datenbank (z. B. im privaten Modus). Öffne FORM. in einem normalen Safari-Fenster oder als Home-Bildschirm-App.';
  }
  if (name === 'QuotaExceededError') return 'Der Speicher des Geräts ist voll. Bitte gib Speicherplatz frei und öffne FORM. erneut.';
  return `FORM. konnte die Daten nicht laden (${(e as Error)?.message ?? String(e)}). Deine bisherigen Daten wurden nicht verändert.`;
}

export async function start(): Promise<void> {
  try {
    db = await openFormDb();
    let migration: MigrationResult | null = null;
    try {
      migration = await runLegacyMigration(db, localStorage);
    } catch (e) {
      // A failed import must never block the app; the legacy data stays untouched in localStorage.
      console.error('Legacy import failed', e);
      set({ error: `Die Übernahme aus der bisherigen App ist fehlgeschlagen: ${(e as Error).message}. Die alten Daten sind unverändert.` });
    }
    await refresh();
    set({ phase: 'ready', migration });
    // Never block the start on this: browsers may delay or prompt before answering.
    const hasData = state.data.sessions.length > 0 || state.data.plans.length > 0;
    persistState(hasData).then((persist) => set({ persist }), () => undefined);
  } catch (e) {
    console.error(e);
    set({ phase: 'error', error: readableError(e) });
  }
}

export async function requestPersist(): Promise<void> {
  set({ persist: await persistState(true) });
}

export function dismissError() {
  set({ error: null });
}

function sortSessions(list: WorkoutSession[]): WorkoutSession[] {
  return list.sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
}

let writes: Promise<unknown> = Promise.resolve();

/** Serialises writes so a slower earlier write can never overwrite a newer one. */
function enqueue(task: () => Promise<unknown>): Promise<void> {
  const next = writes.then(task);
  writes = next.catch(() => undefined);
  return next.then(
    () => undefined,
    (e) => {
      console.error(e);
      set({ error: `Speichern fehlgeschlagen: ${(e as Error).message}. Bitte sichere ein Backup unter „Daten“.` });
    },
  );
}

/** Autosave: updates the screen immediately and writes to IndexedDB in the background. */
export function saveSession(session: WorkoutSession): Promise<void> {
  const others = state.data.sessions.filter((s) => s.id !== session.id);
  set({ data: { ...state.data, sessions: sortSessions([...others, session]) } });
  if (state.persist === 'not-persisted') void requestPersist();
  return enqueue(() => getDb().put('sessions', session));
}

export function deleteSession(id: string): Promise<void> {
  set({ data: { ...state.data, sessions: state.data.sessions.filter((s) => s.id !== id) } });
  return enqueue(() => getDb().delete('sessions', id));
}

export function savePlans(...plans: PlannedWorkout[]): Promise<void> {
  const ids = new Set(plans.map((p) => p.id));
  set({ data: { ...state.data, plans: [...state.data.plans.filter((p) => !ids.has(p.id)), ...plans] } });
  return enqueue(async () => {
    const tx = getDb().transaction('plans', 'readwrite');
    await Promise.all([...plans.map((p) => tx.store.put(p)), tx.done]);
  });
}

export function deletePlan(id: string): Promise<void> {
  // Detached single occurrences belong to their series and go with it.
  const remove = new Set([id, ...state.data.plans.filter((p) => p.detachedFrom?.planId === id).map((p) => p.id)]);
  set({ data: { ...state.data, plans: state.data.plans.filter((p) => !remove.has(p.id)) } });
  return enqueue(async () => {
    const tx = getDb().transaction('plans', 'readwrite');
    await Promise.all([...[...remove].map((x) => tx.store.delete(x)), tx.done]);
  });
}

export function saveTemplate(t: WorkoutTemplate): Promise<void> {
  const templates = [...state.data.templates.filter((x) => x.id !== t.id), t].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  set({ data: { ...state.data, templates } });
  return enqueue(() => getDb().put('templates', t));
}

export function deleteTemplate(id: string): Promise<void> {
  set({ data: { ...state.data, templates: state.data.templates.filter((x) => x.id !== id) } });
  return enqueue(() => getDb().delete('templates', id));
}

export function saveCustomExercise(x: ExerciseDef): Promise<void> {
  const list = [...state.data.customExercises.filter((e) => e.id !== x.id), x].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  set({ data: { ...state.data, customExercises: list } });
  return enqueue(() => getDb().put('exercises', x));
}

export function deleteCustomExercise(id: string): Promise<void> {
  set({ data: { ...state.data, customExercises: state.data.customExercises.filter((e) => e.id !== id) } });
  return enqueue(() => getDb().delete('exercises', id));
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  const settings = normalizeSettings({ ...state.data.settings, ...patch, updatedAt: new Date().toISOString() });
  set({ data: { ...state.data, settings } });
  return enqueue(() => getDb().put('kv', settings, 'settings'));
}

/** Resolves once all pending writes are stored (used before showing "saved" states and in tests). */
export function flushWrites(): Promise<unknown> {
  return writes;
}

export function getState(): AppState {
  return state;
}

export function activeSession(s: AppState = state): WorkoutSession | null {
  return s.data.sessions.find((x) => x.status === 'active') ?? null;
}

export function startRest(seconds: number) {
  set({ rest: seconds > 0 ? { endsAt: Date.now() + seconds * 1000, total: seconds } : null });
}

export function adjustRest(deltaSeconds: number) {
  const r = state.rest;
  if (!r) return;
  const endsAt = Math.max(Date.now(), r.endsAt + deltaSeconds * 1000);
  set({ rest: { endsAt, total: Math.max(1, r.total + deltaSeconds) } });
}

export function stopRest() {
  set({ rest: null });
}
