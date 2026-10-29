import type { WorkoutSession } from './types';

/** Sets with an entered value. Empty planned slots are not counted as performed work. */
export function loggedSets(s: WorkoutSession): number {
  return s.exercises.reduce((n, x) => n + x.sets.filter((set) => set.value !== null).length, 0);
}

export function completed(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.status === 'completed');
}

export interface Overview {
  completed: number;
  drafts: number;
  sets: number;
  last: WorkoutSession | null;
}

export function overview(sessions: readonly WorkoutSession[]): Overview {
  const done = completed(sessions).sort((a, b) => b.date.localeCompare(a.date));
  return {
    completed: done.length,
    drafts: sessions.filter((s) => s.status === 'draft').length,
    sets: done.reduce((n, s) => n + loggedSets(s), 0),
    last: done[0] ?? null,
  };
}
