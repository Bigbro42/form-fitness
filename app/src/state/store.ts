import { useEffect, useState } from 'preact/hooks';
import { getKv, listSnapshots, openFormDb, readUserData, type Db, type LegacyImportState, type Snapshot } from '../db/db';
import { DEFAULT_SETTINGS, type UserData } from '../domain/types';
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
}

let db: Db | null = null;
let state: AppState = {
  phase: 'loading',
  error: null,
  data: { sessions: [], plans: [], customExercises: [], settings: DEFAULT_SETTINGS },
  legacy: null,
  migration: null,
  snapshots: [],
  persist: 'unsupported',
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
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

/** Re-reads everything from IndexedDB after a write. */
export async function refresh(): Promise<void> {
  const d = getDb();
  const [data, legacy, snapshots] = await Promise.all([readUserData(d), getKv(d, 'legacyImport'), listSnapshots(d)]);
  set({ data, legacy: legacy ?? null, snapshots });
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
    const hasData = state.data.sessions.length > 0 || state.data.plans.length > 0;
    set({ phase: 'ready', migration, persist: await persistState(hasData) });
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
