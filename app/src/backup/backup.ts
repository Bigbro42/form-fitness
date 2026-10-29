import { listPhotos, listSnapshots, mergePhotos, mergeUserData, readUserData, saveSnapshot, type Db, type ExercisePhoto, type MergeOutcome, type MergePolicy } from '../db/db';
import { isIsoDate } from '../domain/dates';
import { newId } from '../domain/ids';
import type { PlannedWorkout, UserData, WorkoutSession } from '../domain/types';
import { convertLegacy, inputFromBackup, isLegacyBackup, type ConversionReport } from '../legacy/convert';

export const BACKUP_FORMAT = 'form-backup';
export const BACKUP_SCHEMA = 1;
// Own exercise photos make backups larger (roughly 0.2–0.4 MB per photo).
const MAX_BACKUP_BYTES = 150 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  app: 'FORM.';
  exportedAt: string;
  data: UserData;
  /** Untouched legacy localStorage values from the latest import, so nothing is ever lost. */
  legacyRaw: Record<string, string> | null;
  /** Own exercise photos (added later; older backups have none). */
  photos?: BackupPhoto[];
}

export interface BackupPhoto {
  exerciseId: string;
  type: string;
  /** Base64 of the image file. */
  data: string;
  width: number;
  height: number;
  updatedAt: string;
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

function fromBase64(data: string, type: string): Blob {
  const raw = atob(data);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type });
}

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validPhoto(p: unknown): p is BackupPhoto {
  const x = p as BackupPhoto;
  return typeof x === 'object' && x !== null && typeof x.exerciseId === 'string' && x.exerciseId.length > 0 && PHOTO_TYPES.has(x.type)
    && typeof x.data === 'string' && /^[A-Za-z0-9+/]+=*$/.test(x.data) && typeof x.updatedAt === 'string'
    && Number.isFinite(x.width) && Number.isFinite(x.height);
}

/**
 * Full backup. Photos are left out of the internal snapshots taken before an import: an import
 * never deletes photos, and snapshots should stay small.
 */
export async function createBackup(db: Db, now = new Date(), opts: { photos?: boolean } = {}): Promise<BackupFile> {
  const data = await readUserData(db);
  const legacy = (await listSnapshots(db)).find((s) => s.kind === 'legacy-storage');
  const photos = opts.photos === false ? [] : await Promise.all((await listPhotos(db)).map(async (p): Promise<BackupPhoto> => ({
    exerciseId: p.exerciseId, type: p.blob.type || 'image/jpeg', data: await toBase64(p.blob), width: p.width, height: p.height, updatedAt: p.updatedAt,
  })));
  return {
    ...(photos.length ? { photos } : {}),
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA,
    app: 'FORM.',
    exportedAt: now.toISOString(),
    data,
    legacyRaw: legacy ? (JSON.parse(legacy.payload) as Record<string, string>) : null,
  };
}

export type ParsedBackup =
  | { kind: 'form'; file: BackupFile; sessions: WorkoutSession[]; plans: PlannedWorkout[]; photos: BackupPhoto[]; skipped: string[] }
  | { kind: 'legacy'; sessions: WorkoutSession[]; plans: PlannedWorkout[]; settings: Partial<UserData['settings']>; report: ConversionReport };

export class BackupError extends Error {}

const STATUSES = new Set(['active', 'draft', 'completed']);

function validSession(s: unknown): s is WorkoutSession {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as WorkoutSession;
  return typeof x.id === 'string' && isIsoDate(x.date) && STATUSES.has(x.status) && Array.isArray(x.exercises)
    && x.exercises.every((e) => typeof e?.exerciseId === 'string' && Array.isArray(e.sets));
}

function validPlan(p: unknown): p is PlannedWorkout {
  if (typeof p !== 'object' || p === null) return false;
  const x = p as PlannedWorkout;
  return typeof x.id === 'string' && isIsoDate(x.startsOn) && typeof x.recurrence?.freq === 'string' && typeof x.exceptions === 'object';
}

/** Accepts FORM. backups of this app and every JSON backup of the legacy app. */
export function parseBackup(text: string, fileName: string, now = new Date()): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('Die Datei ist größer als 50 MB und wird nicht importiert.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Die Datei ist kein gültiges JSON. Bitte wähle ein FORM.-Backup aus.');
  }
  if (typeof data === 'object' && data !== null && (data as BackupFile).format === BACKUP_FORMAT) {
    const file = data as BackupFile;
    if (typeof file.schemaVersion !== 'number' || file.schemaVersion > BACKUP_SCHEMA) {
      throw new BackupError('Dieses Backup stammt aus einer neueren FORM.-Version. Bitte aktualisiere die App zuerst.');
    }
    if (!file.data || !Array.isArray(file.data.sessions) || !Array.isArray(file.data.plans)) {
      throw new BackupError('Das Backup ist unvollständig: Trainings oder Termine fehlen.');
    }
    const skipped: string[] = [];
    const sessions = file.data.sessions.filter((s, i) => validSession(s) || (skipped.push(`Training #${i + 1}`), false));
    const plans = file.data.plans.filter((p, i) => validPlan(p) || (skipped.push(`Termin #${i + 1}`), false));
    const photos = (Array.isArray(file.photos) ? file.photos : []).filter((p, i) => validPhoto(p) || (skipped.push(`Foto #${i + 1}`), false));
    return { kind: 'form', file, sessions, plans, photos, skipped };
  }
  if (isLegacyBackup(data)) {
    // Legacy ids are derived from date / random session id, so the same workout imported from
    // localStorage and from a backup file maps to the same record.
    const result = convertLegacy(inputFromBackup(data, fileName), { now });
    return { kind: 'legacy', sessions: result.sessions, plans: result.plans, settings: result.settings, report: result.report };
  }
  throw new BackupError('Diese Datei ist kein FORM.-Backup.');
}

/**
 * Imports a parsed backup. A full snapshot of the current data is stored first, so the
 * previous state can always be downloaded again.
 */
export async function importBackup(db: Db, parsed: ParsedBackup, mode: 'merge' | 'replace', fileName: string, now = new Date()): Promise<MergeOutcome & { photos?: number }> {
  const policy: MergePolicy = mode === 'replace' ? 'replace' : parsed.kind === 'form' ? 'newer-wins' : 'add-missing';
  const before = await createBackup(db, now, { photos: false });
  await saveSnapshot(db, {
    id: newId('snap'),
    takenAt: now.toISOString(),
    kind: 'user-data',
    reason: `Vor dem Import von „${fileName}“`,
    payload: JSON.stringify(before),
  });
  if (parsed.kind === 'form') {
    const photos = parsed.photos.map((p): ExercisePhoto => ({ exerciseId: p.exerciseId, blob: fromBase64(p.data, p.type), width: p.width, height: p.height, updatedAt: p.updatedAt }));
    const outcome = await mergeUserData(db, {
      sessions: parsed.sessions,
      plans: parsed.plans,
      templates: Array.isArray(parsed.file.data.templates) ? parsed.file.data.templates : [],
      customExercises: parsed.file.data.customExercises ?? [],
      settings: parsed.file.data.settings,
    }, policy);
    return { ...outcome, photos: photos.length ? await mergePhotos(db, photos) : 0 };
  }
  return mergeUserData(db, parsed, policy);
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const STATUS_LABEL: Record<WorkoutSession['status'], string> = { completed: 'Abgeschlossen', draft: 'Nicht abgeschlossen', active: 'Läuft' };
const SOURCE_LABEL: Record<WorkoutSession['source'], string> = { manual: 'Ohne Termin', calendar: 'Kalender', randomizer: 'Zufallstraining' };

/** One row per set; semicolon separated with BOM so Excel (de) opens it correctly. */
export function sessionsToCsv(sessions: WorkoutSession[]): string {
  const rows: unknown[][] = [['Datum', 'Training', 'Status', 'Quelle', 'Übung', 'Übungs-ID', 'Variante', 'Satz', 'Wiederholungen', 'Sekunden', 'Minuten', 'Gewicht (kg)', 'Abgehakt', 'Dauer (Min.)', 'Belastung (RPE)', 'Notiz']];
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    const base = [s.date, s.title, STATUS_LABEL[s.status], SOURCE_LABEL[s.source]];
    const tail = [s.durationMin, s.rpe, s.note];
    if (!s.exercises.length) rows.push([...base, '', '', '', '', '', '', '', '', '', ...tail]);
    for (const x of s.exercises) {
      if (!x.sets.length) rows.push([...base, x.name, x.exerciseId, x.variant, '', '', '', '', '', '', ...tail]);
      x.sets.forEach((set, i) => rows.push([
        ...base, x.name, x.exerciseId, x.variant, i + 1,
        x.metric === 'reps' ? set.value : '', x.metric === 'seconds' ? set.value : '', x.metric === 'minutes' ? set.value : '',
        set.weightKg, set.done ? 'Ja' : 'Nein', ...tail,
      ]));
    }
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}
