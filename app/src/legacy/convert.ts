/**
 * Converts data of the legacy FORM. app (V1–V26, localStorage) into the new model.
 *
 * Pure functions only: nothing here reads or writes storage. The raw legacy strings are
 * archived separately and never modified, so every conversion can be repeated or audited.
 *
 * Legacy formats (from the V26 source):
 * - form-coach-v5: { version: 5, records, plans, sex }
 *     records[date] = { complete, completedExercises?, completedAt?, note?, duration?, energy?, steps?, goalV26? }
 *     records.__form_v26_settings = { goal, equipment, seriesGoals }
 *     plans[date] = Item[]
 * - form-trainingscoach-v1…v4: { records } or the records object itself (only read when v5 is absent)
 * - form-random-workouts-v1: [{ id, date, createdAt, focus, duration, goalV26, completed, completedAt?, exercises: Item[] }]
 * - form-calendar-v20: { oneOff: { [date]: Event }, series: Event[], skips: { "seriesId|date": true } }
 *     Event = { id, name, type: "strength" | "sport", time, preset: "" | "A" | "B", freq?, interval?, startsOn?, endsOn? }
 *     "Jetzt trainieren" (V22 quickStart) silently created a one-off event with id "quick-…". Those are
 *     not plans: they only label the spontaneous workout of that day and are not converted to calendar entries.
 * - Item = { id, variant, sets: (number|string|null)[], weights?: (number|string|null)[], done?: boolean[] }
 * - JSON backups: { version: 11 | 20, records, plans, sex, randomSessions?, scheduleV20? }
 */
import { builtinExercise } from '../domain/catalog';
import { isIsoDate, parseDate, today as todayIso } from '../domain/dates';
import { ruleMatches } from '../domain/recurrence';
import type {
  EquipmentId,
  GoalId,
  IsoDate,
  LegacyOrigin,
  Metric,
  PlannedWorkout,
  SessionExercise,
  SetEntry,
  Settings,
  WorkoutSession,
} from '../domain/types';

export const LEGACY_KEYS = [
  'form-coach-v5',
  'form-trainingscoach-v4',
  'form-trainingscoach-v3',
  'form-trainingscoach-v2',
  'form-trainingscoach-v1',
  'form-random-workouts-v1',
  'form-calendar-v20',
  'form-pwa-reminders',
  'form-rest-length',
  'form-rest-auto',
] as const;

const OLDER_COACH_KEYS = ['form-trainingscoach-v4', 'form-trainingscoach-v3', 'form-trainingscoach-v2', 'form-trainingscoach-v1'];
const SETTINGS_RECORD = '__form_v26_settings';
const LEGACY_DEFAULTS: Record<string, string[]> = {
  A: ['squat', 'bridge', 'lunge', 'deadbug'],
  B: ['pushup', 'snow', 'hinge', 'sideplank'],
};
const FOCUS_LABELS: Record<string, string> = {
  all: 'Ganzkörper', legs: 'Beine', abs: 'Bauch & Core', upper: 'Oberkörper', lower: 'Unterkörper',
};
const LEGACY_GOALS: GoalId[] = ['health', 'aesthetic', 'strength', 'muscular', 'cardio', 'core', 'mobility', 'athletic'];
const EQUIPMENT: EquipmentId[] = ['body', 'band', 'dumbbell', 'barbell', 'machine', 'cardio'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Normalised view of whatever legacy data was found. */
export interface LegacyInput {
  /** Where the data came from, e.g. "localStorage" or a backup file name. */
  origin: string;
  coachKey: string | null;
  records: Obj;
  plans: Obj;
  randomSessions: unknown[];
  calendar: { oneOff: Obj; series: unknown[]; skips: Obj } | null;
  restSeconds: number | null;
  restAuto: boolean | null;
}

export interface ConversionReport {
  completedSessions: number;
  draftSessions: number;
  plannedWorkouts: number;
  /** Legacy entries without any user input (e.g. an unchanged generated plan). Kept only in the raw archive. */
  skippedEmpty: number;
  unknownExercises: string[];
  problems: string[];
}

export interface ConversionResult {
  sessions: WorkoutSession[];
  plans: PlannedWorkout[];
  settings: Partial<Settings>;
  report: ConversionReport;
}

function parseJson(raw: string | null | undefined, problems: string[], key: string): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    problems.push(`${key}: kein gültiges JSON, Rohdaten bleiben erhalten.`);
    return null;
  }
}

/** Reads the legacy keys the same way the old app did (v5 wins over v1–v4). */
export function inputFromStorage(raw: Partial<Record<string, string | null>>, problems: string[] = []): LegacyInput {
  let coachKey: string | null = null;
  let records: Obj = {};
  let plans: Obj = {};
  const v5 = parseJson(raw['form-coach-v5'], problems, 'form-coach-v5');
  if (isObj(v5)) {
    coachKey = 'form-coach-v5';
    records = isObj(v5.records) ? v5.records : {};
    plans = isObj(v5.plans) ? v5.plans : {};
  } else {
    for (const key of OLDER_COACH_KEYS) {
      const old = parseJson(raw[key], problems, key);
      if (isObj(old)) {
        coachKey = key;
        records = isObj(old.records) ? old.records : old;
        break;
      }
    }
  }
  const random = parseJson(raw['form-random-workouts-v1'], problems, 'form-random-workouts-v1');
  const calendar = parseJson(raw['form-calendar-v20'], problems, 'form-calendar-v20');
  const restLength = Number(raw['form-rest-length']);
  return {
    origin: 'localStorage',
    coachKey,
    records,
    plans,
    randomSessions: Array.isArray(random) ? random : [],
    calendar: normaliseCalendar(calendar),
    restSeconds: raw['form-rest-length'] != null && Number.isFinite(restLength) && restLength > 0 ? restLength : null,
    restAuto: raw['form-rest-auto'] == null ? null : raw['form-rest-auto'] !== 'false',
  };
}

/** Recognises JSON backups written by the legacy app (version 5, 11 and 20). */
export function isLegacyBackup(data: unknown): data is Obj {
  return isObj(data) && isObj(data.records);
}

export function inputFromBackup(data: Obj, origin: string): LegacyInput {
  return {
    origin,
    coachKey: 'backup',
    records: data.records as Obj,
    plans: isObj(data.plans) ? data.plans : {},
    randomSessions: Array.isArray(data.randomSessions) ? data.randomSessions : [],
    calendar: normaliseCalendar(data.scheduleV20),
    restSeconds: null,
    restAuto: null,
  };
}

function normaliseCalendar(v: unknown): LegacyInput['calendar'] {
  if (!isObj(v)) return null;
  return {
    oneOff: isObj(v.oneOff) ? v.oneOff : {},
    series: Array.isArray(v.series) ? v.series : [],
    skips: isObj(v.skips) ? v.skips : {},
  };
}

/** Same rule as the legacy isVal(): a finite, non-negative number or numeric string. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

interface ItemContext {
  sessionId: string;
  unknown: Set<string>;
}

function convertItem(item: unknown, index: number, ctx: ItemContext): SessionExercise | null {
  if (!isObj(item) || typeof item.id !== 'string') return null;
  const def = builtinExercise(item.id);
  if (!def) ctx.unknown.add(item.id);
  const values = Array.isArray(item.sets) ? item.sets : [];
  const weights = Array.isArray(item.weights) ? item.weights : [];
  const done = Array.isArray(item.done) ? item.done : [];
  const count = Math.max(values.length, weights.length);
  const id = `${ctx.sessionId}:${index}`;
  const sets: SetEntry[] = Array.from({ length: count }, (_, j) => ({
    id: `${id}:${j}`,
    value: num(values[j]),
    weightKg: num(weights[j]),
    done: Boolean(done[j]),
  }));
  const variant = item.variant === 'easy' || item.variant === 'hard' ? item.variant : 'standard';
  return {
    id,
    exerciseId: item.id,
    name: def?.name ?? item.id,
    metric: def?.metric ?? ('reps' as Metric),
    variant,
    sets,
  };
}

function hasValues(exercises: SessionExercise[]): boolean {
  return exercises.some((x) => x.sets.some((s) => s.value !== null || s.weightKg !== null));
}

interface LegacyEvent {
  id: string;
  name: string;
  type: 'strength' | 'sport';
  time: string | null;
  preset: string;
  goal: GoalId | null;
}

const isQuickStart = (ev: LegacyEvent) => ev.id.startsWith('quick-');

function eventFrom(v: Obj, fallbackId: string, seriesGoals: Obj): LegacyEvent {
  const id = typeof v.id === 'string' && v.id ? v.id : fallbackId;
  const goal = seriesGoals[id];
  return {
    id,
    name: str(v.name).trim() || 'Training',
    type: v.type === 'sport' ? 'sport' : 'strength',
    time: typeof v.time === 'string' && /^\d{2}:\d{2}$/.test(v.time) ? v.time : null,
    preset: str(v.preset),
    goal: LEGACY_GOALS.includes(goal as GoalId) ? (goal as GoalId) : null,
  };
}

/** The event the legacy calendar showed on a date (one-off first, then series). */
function legacyEventOn(input: LegacyInput, date: IsoDate, seriesGoals: Obj): LegacyEvent | null {
  const cal = input.calendar;
  if (!cal) return null;
  const one = cal.oneOff[date];
  if (isObj(one)) return eventFrom(one, `oneoff-${date}`, seriesGoals);
  for (const [i, s] of cal.series.entries()) {
    if (!isObj(s) || !isIsoDate(s.startsOn)) continue;
    const id = typeof s.id === 'string' ? s.id : `series-${i}`;
    if (cal.skips[`${id}|${date}`]) continue;
    if (ruleMatches(seriesSchedule(s), date)) return eventFrom(s, id, seriesGoals);
  }
  return null;
}

function seriesSchedule(s: Obj): Pick<PlannedWorkout, 'startsOn' | 'recurrence'> {
  const freq = s.freq === 'daily' || s.freq === 'monthly' ? s.freq : 'weekly';
  return {
    startsOn: s.startsOn as IsoDate,
    recurrence: { freq, interval: Math.max(1, Number(s.interval) || 1), until: isIsoDate(s.endsOn) ? s.endsOn : null },
  };
}

/** Titles the pre-V21 fixed weekly plan used (Mon A, Tue martial arts, Thu B). */
function fixedPlanDay(date: IsoDate): { title: string; activity: 'strength' | 'sport' } | null {
  const day = parseDate(date).getDay();
  if (day === 1) return { title: 'Krafttraining A', activity: 'strength' };
  if (day === 2) return { title: 'Kampfsport', activity: 'sport' };
  if (day === 4) return { title: 'Krafttraining B', activity: 'strength' };
  return null;
}

function goalOf(v: unknown): GoalId | null {
  return LEGACY_GOALS.includes(v as GoalId) ? (v as GoalId) : null;
}

function isoTime(v: unknown): string | null {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
}

export function convertLegacy(input: LegacyInput, options: { now?: Date } = {}): ConversionResult {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const today = todayIso(now);
  const unknown = new Set<string>();
  const report: ConversionReport = { completedSessions: 0, draftSessions: 0, plannedWorkouts: 0, skippedEmpty: 0, unknownExercises: [], problems: [] };
  const sessions: WorkoutSession[] = [];
  const plans: PlannedWorkout[] = [];
  const prefs = isObj(input.records[SETTINGS_RECORD]) ? (input.records[SETTINGS_RECORD] as Obj) : {};
  const seriesGoals = isObj(prefs.seriesGoals) ? prefs.seriesGoals : {};
  const sourceKey = input.coachKey ?? input.origin;

  // 1. Day-based workouts of the regular plan.
  const dates = new Set([...Object.keys(input.records), ...Object.keys(input.plans)]);
  dates.delete(SETTINGS_RECORD);
  for (const date of [...dates].sort()) {
    if (!isIsoDate(date)) {
      report.problems.push(`Eintrag „${date}“ hat kein gültiges Datum und wurde nur im Rohdatenarchiv behalten.`);
      continue;
    }
    const rec = isObj(input.records[date]) ? (input.records[date] as Obj) : {};
    const complete = rec.complete === true;
    const snapshot = Array.isArray(rec.completedExercises) ? rec.completedExercises : null;
    const plan = Array.isArray(input.plans[date]) ? (input.plans[date] as unknown[]) : null;
    const id = `legacy-day-${date}`;
    const ctx = { sessionId: id, unknown };
    const items = (complete && snapshot ? snapshot : plan ?? snapshot ?? []);
    const exercises = items.map((x, i) => convertItem(x, i, ctx)).filter((x): x is SessionExercise => x !== null);
    const note = str(rec.note).trim();
    const durationMin = num(rec.duration);
    const steps = num(rec.steps);
    const energy = str(rec.energy).trim() || null;
    const hasContent = hasValues(exercises) || note !== '' || durationMin !== null || steps !== null || energy !== null;

    if (!complete && !hasContent && !(plan && plan.length && date >= today)) {
      report.skippedEmpty++;
      continue;
    }

    const inferred: string[] = [];
    const event = legacyEventOn(input, date, seriesGoals);
    let title = event?.name;
    let activity = event?.type;
    if (!title) {
      const fixed = !exercises.length && complete ? fixedPlanDay(date) : null;
      if (fixed) inferred.push('title');
      title = fixed?.title ?? 'Training';
      activity = fixed?.activity ?? 'strength';
    }
    let completedAt = complete ? isoTime(rec.completedAt) : null;
    if (complete && !completedAt) {
      completedAt = new Date(`${date}T12:00:00`).toISOString();
      inferred.push('completedAt');
    }
    const legacy: LegacyOrigin = { key: sourceKey, ref: date, ...(inferred.length ? { inferred } : {}) };
    sessions.push({
      id,
      date,
      title,
      activity: activity ?? 'strength',
      status: complete ? 'completed' : 'draft',
      source: event && !isQuickStart(event) ? 'calendar' : 'manual',
      goal: goalOf(rec.goalV26) ?? event?.goal ?? null,
      exercises,
      startedAt: null,
      completedAt,
      durationMin,
      rpe: null,
      energy,
      steps,
      note,
      ...(event && !isQuickStart(event) ? { plannedRef: { planId: `legacy-plan-${event.id}`, occurrence: date } } : {}),
      legacy,
      rev: 0,
      updatedAt: nowIso,
    });
    if (complete) report.completedSessions++;
    else report.draftSessions++;
  }

  // 2. Randomizer sessions.
  const seenRandom = new Set<string>();
  for (const [i, raw] of input.randomSessions.entries()) {
    if (!isObj(raw) || !Array.isArray(raw.exercises)) continue;
    const ref = typeof raw.id === 'string' && raw.id ? raw.id : `index-${i}`;
    if (seenRandom.has(ref)) continue;
    seenRandom.add(ref);
    const createdAt = isoTime(raw.createdAt);
    const date = isIsoDate(raw.date) ? raw.date : createdAt ? todayIso(new Date(createdAt)) : null;
    if (!date) {
      report.problems.push(`Zufallstraining „${ref}“ hat kein gültiges Datum und wurde nur im Rohdatenarchiv behalten.`);
      continue;
    }
    const id = `legacy-random-${ref}`;
    const exercises = raw.exercises.map((x, j) => convertItem(x, j, { sessionId: id, unknown })).filter((x): x is SessionExercise => x !== null);
    const complete = raw.completed === true;
    if (!complete && !hasValues(exercises)) {
      report.skippedEmpty++;
      continue;
    }
    const inferred: string[] = [];
    let completedAt = complete ? isoTime(raw.completedAt) : null;
    if (complete && !completedAt) {
      completedAt = createdAt ?? new Date(`${date}T12:00:00`).toISOString();
      inferred.push('completedAt');
    }
    const focus = str(raw.focus) || 'all';
    sessions.push({
      id,
      date,
      title: `Zufallstraining · ${FOCUS_LABELS[focus] ?? focus}`,
      activity: 'strength',
      status: complete ? 'completed' : 'draft',
      source: 'randomizer',
      goal: goalOf(raw.goalV26),
      exercises,
      startedAt: createdAt,
      completedAt,
      durationMin: null,
      rpe: null,
      energy: null,
      steps: null,
      note: '',
      generator: { focus, durationMin: num(raw.duration) },
      legacy: { key: 'form-random-workouts-v1', ref, ...(inferred.length ? { inferred } : {}) },
      rev: 0,
      updatedAt: nowIso,
    });
    if (complete) report.completedSessions++;
    else report.draftSessions++;
  }

  // 3. Calendar entries (V21+ blank-slate calendar). Planned entries never count as training.
  if (input.calendar) {
    const toPlan = (ev: LegacyEvent, startsOn: IsoDate, recurrence: PlannedWorkout['recurrence'], exceptions: PlannedWorkout['exceptions']): PlannedWorkout => ({
      id: `legacy-plan-${ev.id}`,
      title: ev.name,
      activity: ev.type,
      startsOn,
      time: ev.time,
      recurrence,
      exercises: ev.type === 'strength' ? (LEGACY_DEFAULTS[ev.preset] ?? []).map((exerciseId) => ({ exerciseId, sets: 2 })) : [],
      goal: ev.goal,
      exceptions,
      legacy: { key: 'form-calendar-v20', ref: ev.id },
      rev: 0,
      updatedAt: nowIso,
    });
    for (const [date, raw] of Object.entries(input.calendar.oneOff)) {
      if (!isObj(raw) || !isIsoDate(date)) continue;
      const ev = eventFrom(raw, `oneoff-${date}`, seriesGoals);
      if (!isQuickStart(ev)) plans.push(toPlan(ev, date, { freq: 'once' }, {}));
    }
    for (const [i, raw] of input.calendar.series.entries()) {
      if (!isObj(raw)) continue;
      if (!isIsoDate(raw.startsOn)) {
        report.problems.push(`Serientermin „${str(raw.name) || i}“ hat kein gültiges Startdatum und wurde nur im Rohdatenarchiv behalten.`);
        continue;
      }
      const ev = eventFrom(raw, `series-${i}`, seriesGoals);
      const exceptions: PlannedWorkout['exceptions'] = {};
      for (const [k, v] of Object.entries(input.calendar.skips)) {
        const [sid, date] = k.split('|');
        if (v && sid === ev.id && isIsoDate(date)) exceptions[date] = { type: 'skip' };
      }
      plans.push(toPlan(ev, raw.startsOn, seriesSchedule(raw).recurrence, exceptions));
    }
    report.plannedWorkouts = plans.length;
  }

  // 4. Preferences.
  const settings: Partial<Settings> = {};
  const goal = goalOf(prefs.goal);
  if (goal) settings.primaryGoal = goal;
  if (Array.isArray(prefs.equipment)) {
    const eq = prefs.equipment.filter((x): x is EquipmentId => EQUIPMENT.includes(x as EquipmentId));
    if (eq.length) settings.equipment = eq;
  }
  if (input.restSeconds !== null) settings.restSeconds = input.restSeconds;
  if (input.restAuto !== null) settings.restAuto = input.restAuto;

  report.unknownExercises = [...unknown].sort();
  if (report.unknownExercises.length) {
    report.problems.push(`Unbekannte Übungs-IDs übernommen (Name = ID): ${report.unknownExercises.join(', ')}`);
  }
  return { sessions, plans, settings, report };
}
