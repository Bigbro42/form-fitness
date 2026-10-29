/** User actions of the workout flow. Each one changes the session purely and autosaves it. */
import { makeLookup } from '../domain/catalog';
import { today } from '../domain/dates';
import * as S from '../domain/session';
import type { ExerciseDef, GoalId, SetEntry, WorkoutSession } from '../domain/types';
import { navigate } from '../ui/router';
import { activeSession, deleteSession, saveSession, saveSettings, startRest, useAppState, type AppState } from './store';

export function useLookup() {
  const { data } = useAppState();
  return makeLookup(data.customExercises);
}

function current(): WorkoutSession | null {
  return activeSession();
}

function apply(fn: (s: WorkoutSession) => WorkoutSession): WorkoutSession | null {
  const s = current();
  if (!s) return null;
  const next = fn(s);
  if (next !== s) void saveSession(next);
  return next;
}

/** Starts a spontaneous workout today, or returns to the one already running. */
export function startWorkout(state: AppState): void {
  if (!activeSession(state)) {
    void saveSession(S.createSession({ date: today(), goal: state.data.settings.primaryGoal }));
  }
  navigate({ name: 'workout' });
}

export function addToWorkout(def: ExerciseDef): string | null {
  const s = current();
  if (!s) return null;
  const ex = S.newExercise(def, s.goal);
  apply((x) => S.addExercise(x, ex));
  return ex.id;
}

export const replaceInWorkout = (exId: string, def: ExerciseDef) => apply((s) => S.replaceExercise(s, exId, def, s.goal));
export const removeFromWorkout = (exId: string) => apply((s) => S.removeExercise(s, exId));
export const moveInWorkout = (exId: string, delta: -1 | 1) => apply((s) => S.moveExercise(s, exId, delta));
export const updateWorkoutSet = (exId: string, setId: string, patch: Partial<Omit<SetEntry, 'id'>>) => apply((s) => S.updateSet(s, exId, setId, patch));
export const addWorkoutSet = (exId: string) => apply((s) => S.addSet(s, exId));
export const removeWorkoutSet = (exId: string, setId: string) => apply((s) => S.removeSet(s, exId, setId));
export const applyPreviousSets = (exId: string, previous: readonly SetEntry[]) => apply((s) => S.applyPrevious(s, exId, previous));
export const setWorkoutVariant = (exId: string, v: 'standard' | 'easy' | 'hard') => apply((s) => S.setVariant(s, exId, v));
export const setWorkoutGoal = (goal: GoalId | null) => apply((s) => S.updateDetails(s, { goal }));
export const setWorkoutTitle = (title: string) => apply((s) => S.updateDetails(s, { title: title.trim() || 'Training' }));

/**
 * Ticks a set off. Ticking an empty set takes over the suggested values (previous performance);
 * without any value there is nothing to tick, so the caller focuses the input instead.
 */
export function toggleSetDone(exId: string, set: SetEntry, suggestion: SetEntry | undefined, restSeconds: number, restAuto: boolean): boolean {
  if (set.done) {
    updateWorkoutSet(exId, set.id, { done: false });
    return true;
  }
  const value = set.value ?? suggestion?.value ?? null;
  if (value === null) return false;
  updateWorkoutSet(exId, set.id, { done: true, value, weightKg: set.weightKg ?? (set.value === null ? suggestion?.weightKg ?? null : null) });
  if (restAuto) startRest(restSeconds);
  return true;
}

export function finishWorkout(details: { rpe: number | null; note: string; durationMin: number | null }): WorkoutSession | null {
  const done = apply((s) => S.complete(s, details));
  if (done) {
    startRest(0);
    navigate({ name: 'summary', id: done.id }, true);
  }
  return done;
}

/** Leaves without completing: empty workouts are deleted, others are kept as "not completed". */
export function leaveWorkout(): void {
  const s = current();
  if (!s) return;
  startRest(0);
  if (!s.reopened && !S.hasLoggedWork(s) && !s.legacy) void deleteSession(s.id);
  else void saveSession(S.park(s));
  navigate({ name: 'home' }, true);
}

export function reopenSession(session: WorkoutSession): boolean {
  if (current()) return false;
  void saveSession(session.status === 'draft' ? S.resume(session) : S.reopen(session));
  navigate({ name: 'workout' });
  return true;
}

export function rememberRest(seconds: number) {
  void saveSettings({ restSeconds: seconds });
}
