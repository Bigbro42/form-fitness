/**
 * Pure state changes of a workout session. Every change returns a new object with rev + 1 and a
 * fresh updatedAt; callers persist the result. Completed sessions are protected: they only
 * change after an explicit reopen().
 */
import { newId } from './ids';
import { recommend } from './recommendations';
import type { ExerciseDef, GoalId, IsoDate, SessionExercise, SetEntry, WorkoutSession } from './types';

export class LockedError extends Error {
  constructor() {
    super('Abgeschlossene Trainings können erst nach „Korrigieren“ geändert werden.');
  }
}

function touch(s: WorkoutSession, patch: Partial<WorkoutSession>, now: Date): WorkoutSession {
  return { ...s, ...patch, rev: s.rev + 1, updatedAt: now.toISOString() };
}

function editable(s: WorkoutSession) {
  if (s.status === 'completed') throw new LockedError();
}

export function createSession(opts: { date: IsoDate; goal: GoalId | null; title?: string; source?: WorkoutSession['source']; now?: Date }): WorkoutSession {
  const now = opts.now ?? new Date();
  return {
    id: newId('ses'),
    date: opts.date,
    title: opts.title ?? 'Training',
    activity: 'strength',
    status: 'active',
    source: opts.source ?? 'manual',
    goal: opts.goal,
    exercises: [],
    startedAt: now.toISOString(),
    completedAt: null,
    durationMin: null,
    rpe: null,
    energy: null,
    steps: null,
    note: '',
    rev: 1,
    updatedAt: now.toISOString(),
  };
}

const emptySet = (): SetEntry => ({ id: newId('set'), value: null, weightKg: null, done: false });

export function newExercise(def: ExerciseDef, goal: GoalId | null, setCount?: number): SessionExercise {
  const count = setCount ?? recommend(def, goal).sets[0];
  return {
    id: newId('ex'),
    exerciseId: def.id,
    name: def.name,
    metric: def.metric,
    variant: 'standard',
    sets: Array.from({ length: Math.max(1, count) }, emptySet),
  };
}

function mapExercise(s: WorkoutSession, exId: string, fn: (x: SessionExercise) => SessionExercise, now: Date): WorkoutSession {
  editable(s);
  if (!s.exercises.some((x) => x.id === exId)) return s;
  return touch(s, { exercises: s.exercises.map((x) => (x.id === exId ? fn(x) : x)) }, now);
}

export function addExercise(s: WorkoutSession, ex: SessionExercise, now = new Date()): WorkoutSession {
  editable(s);
  return touch(s, { exercises: [...s.exercises, ex] }, now);
}

export function removeExercise(s: WorkoutSession, exId: string, now = new Date()): WorkoutSession {
  editable(s);
  return touch(s, { exercises: s.exercises.filter((x) => x.id !== exId) }, now);
}

/** Swaps the movement but keeps the position; entered sets are kept only if the metric matches. */
export function replaceExercise(s: WorkoutSession, exId: string, def: ExerciseDef, goal: GoalId | null, now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => {
    const fresh = newExercise(def, goal, x.sets.length);
    return { ...fresh, id: x.id, sets: x.metric === def.metric ? x.sets : fresh.sets };
  }, now);
}

export function moveExercise(s: WorkoutSession, exId: string, delta: -1 | 1, now = new Date()): WorkoutSession {
  editable(s);
  const i = s.exercises.findIndex((x) => x.id === exId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.exercises.length) return s;
  const list = [...s.exercises];
  [list[i], list[j]] = [list[j]!, list[i]!];
  return touch(s, { exercises: list }, now);
}

export function updateSet(s: WorkoutSession, exId: string, setId: string, patch: Partial<Omit<SetEntry, 'id'>>, now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => ({ ...x, sets: x.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) }), now);
}

/** New set pre-filled with the previous set's load (the usual case for straight sets). */
export function addSet(s: WorkoutSession, exId: string, now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => ({ ...x, sets: [...x.sets, { ...emptySet(), weightKg: x.sets.at(-1)?.weightKg ?? null }] }), now);
}

export function removeSet(s: WorkoutSession, exId: string, setId: string, now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => ({ ...x, sets: x.sets.filter((set) => set.id !== setId) }), now);
}

export function setVariant(s: WorkoutSession, exId: string, variant: SessionExercise['variant'], now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => ({ ...x, variant }), now);
}

/**
 * Copies values of a previous performance into the sets that are still empty. Existing entries
 * are never overwritten; missing sets are added.
 */
export function applyPrevious(s: WorkoutSession, exId: string, previous: readonly SetEntry[], now = new Date()): WorkoutSession {
  return mapExercise(s, exId, (x) => {
    const sets = [...x.sets];
    previous.forEach((p, i) => {
      const cur = sets[i];
      if (!cur) sets.push({ ...emptySet(), value: p.value, weightKg: p.weightKg });
      else if (cur.value === null && cur.weightKg === null && !cur.done) sets[i] = { ...cur, value: p.value, weightKg: p.weightKg };
    });
    return { ...x, sets };
  }, now);
}

export function updateDetails(s: WorkoutSession, patch: Partial<Pick<WorkoutSession, 'title' | 'goal' | 'note' | 'rpe' | 'durationMin'>>, now = new Date()): WorkoutSession {
  editable(s);
  return touch(s, patch, now);
}

/** Whether there is anything worth saving as a completed workout. */
export function hasLoggedWork(s: WorkoutSession): boolean {
  return s.exercises.some((x) => x.sets.some((set) => set.value !== null));
}

export function elapsedMinutes(s: WorkoutSession, now: Date): number | null {
  if (!s.startedAt) return null;
  return Math.max(1, Math.round((now.getTime() - Date.parse(s.startedAt)) / 60_000));
}

/**
 * Completes the session. A correction of an already completed session keeps its original
 * completion time and duration unless the user changed them.
 */
export function complete(s: WorkoutSession, details: { rpe: number | null; note: string; durationMin: number | null }, now = new Date()): WorkoutSession {
  editable(s);
  return touch(s, {
    status: 'completed',
    completedAt: s.reopened?.original.completedAt ?? now.toISOString(),
    durationMin: details.durationMin ?? s.reopened?.original.durationMin ?? elapsedMinutes(s, now),
    rpe: details.rpe,
    note: details.note,
    reopened: undefined,
  }, now);
}

/** Deliberate correction of a completed workout. */
export function reopen(s: WorkoutSession, now = new Date()): WorkoutSession {
  if (s.status !== 'completed') return s;
  return touch(s, { status: 'active', reopened: { original: s } }, now);
}

/** Drops all changes of a correction and restores the completed workout as it was. */
export function discardCorrection(s: WorkoutSession, now = new Date()): WorkoutSession {
  if (!s.reopened) return s;
  return { ...s.reopened.original, rev: s.rev + 1, updatedAt: now.toISOString() };
}

/** Continue a draft (e.g. an unfinished workout from the legacy app). */
export function resume(s: WorkoutSession, now = new Date()): WorkoutSession {
  if (s.status !== 'draft') return s;
  return touch(s, { status: 'active', startedAt: s.startedAt ?? now.toISOString() }, now);
}

/** Ends a running workout without completing it; it stays in history as "not completed". */
export function park(s: WorkoutSession, now = new Date()): WorkoutSession {
  if (s.status !== 'active') return s;
  if (s.reopened) return discardCorrection(s, now);
  return touch(s, { status: 'draft' }, now);
}
