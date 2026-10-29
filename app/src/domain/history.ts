/**
 * Per-exercise history and personal bests. Only completed sessions count; drafts and the
 * running session are never used as "performance".
 */
import type { Metric, SessionExercise, SetEntry, WorkoutSession } from './types';

export interface ExerciseEntry {
  session: WorkoutSession;
  exercise: SessionExercise;
  /** Sets with an entered value. */
  sets: SetEntry[];
}

/** Newest first. Every appearance of the exercise in a completed session with logged values. */
export function exerciseHistory(sessions: readonly WorkoutSession[], exerciseId: string, excludeSessionId?: string): ExerciseEntry[] {
  const out: ExerciseEntry[] = [];
  for (const session of sessions) {
    if (session.status !== 'completed' || session.id === excludeSessionId) continue;
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      const sets = exercise.sets.filter((s) => s.value !== null);
      if (sets.length) out.push({ session, exercise, sets });
    }
  }
  return out.sort((a, b) => b.session.date.localeCompare(a.session.date) || (b.session.completedAt ?? '').localeCompare(a.session.completedAt ?? ''));
}

export interface PersonalBests {
  /** Heaviest load with its repetitions (only sets with load). */
  heaviest: { weightKg: number; value: number; date: string } | null;
  /** Most repetitions / longest time in a single set. */
  bestValue: { value: number; weightKg: number | null; date: string } | null;
  /** Largest load × reps of one set (reps exercises with load only). */
  bestSetVolume: { volume: number; date: string } | null;
}

export function personalBests(entries: readonly ExerciseEntry[], metric: Metric): PersonalBests {
  const pb: PersonalBests = { heaviest: null, bestValue: null, bestSetVolume: null };
  for (const e of entries) {
    for (const s of e.sets) {
      const v = s.value!;
      if (s.weightKg !== null && s.weightKg > 0) {
        if (!pb.heaviest || s.weightKg > pb.heaviest.weightKg || (s.weightKg === pb.heaviest.weightKg && v > pb.heaviest.value)) {
          pb.heaviest = { weightKg: s.weightKg, value: v, date: e.session.date };
        }
        if (metric === 'reps' && (!pb.bestSetVolume || s.weightKg * v > pb.bestSetVolume.volume)) {
          pb.bestSetVolume = { volume: s.weightKg * v, date: e.session.date };
        }
      }
      if (!pb.bestValue || v > pb.bestValue.value) pb.bestValue = { value: v, weightKg: s.weightKg, date: e.session.date };
    }
  }
  return pb;
}

export interface NewRecord {
  exerciseId: string;
  name: string;
  kind: 'heaviest' | 'bestValue';
  label: string;
}

/** Records the given session sets compared with everything completed before it. */
export function recordsIn(session: WorkoutSession, all: readonly WorkoutSession[]): NewRecord[] {
  const out: NewRecord[] = [];
  const seen = new Set<string>();
  for (const x of session.exercises) {
    if (seen.has(x.exerciseId)) continue;
    seen.add(x.exerciseId);
    const before = exerciseHistory(all.filter((s) => s.date < session.date || (s.date === session.date && (s.completedAt ?? '') < (session.completedAt ?? ''))), x.exerciseId, session.id);
    if (!before.length) continue; // a first time is not a record
    const old = personalBests(before, x.metric);
    const now = personalBests([{ session, exercise: x, sets: session.exercises.filter((e) => e.exerciseId === x.exerciseId).flatMap((e) => e.sets.filter((s) => s.value !== null)) }], x.metric);
    if (now.heaviest && (!old.heaviest || now.heaviest.weightKg > old.heaviest.weightKg)) {
      out.push({ exerciseId: x.exerciseId, name: x.name, kind: 'heaviest', label: `${fmtNum(now.heaviest.weightKg)} kg × ${fmtNum(now.heaviest.value)}` });
    } else if (now.bestValue && old.bestValue && now.bestValue.value > old.bestValue.value && (now.bestValue.weightKg ?? 0) >= (old.bestValue.weightKg ?? 0)) {
      out.push({ exerciseId: x.exerciseId, name: x.name, kind: 'bestValue', label: `${fmtNum(now.bestValue.value)} ${METRIC_SHORT[x.metric]}` });
    }
  }
  return out;
}

const METRIC_SHORT: Record<Metric, string> = { reps: 'Wdh.', seconds: 'Sek.', minutes: 'Min.' };

export function fmtNum(n: number): string {
  return n.toLocaleString('de-AT', { maximumFractionDigits: 2 });
}

/** Compact "10 kg × 12 · 10 kg × 10" or "30 Sek. · 35 Sek.". */
export function setsSummary(sets: readonly SetEntry[], metric: Metric): string {
  return sets
    .filter((s) => s.value !== null)
    .map((s) => (s.weightKg ? `${fmtNum(s.weightKg)} kg × ${fmtNum(s.value!)}` : `${fmtNum(s.value!)} ${METRIC_SHORT[metric]}`))
    .join(' · ');
}

/** Load × reps of all sets with load. Not meaningful for time-based or bodyweight sets. */
export function volumeKg(session: WorkoutSession): number {
  let v = 0;
  for (const x of session.exercises) {
    if (x.metric !== 'reps') continue;
    for (const s of x.sets) if (s.value !== null && s.weightKg) v += s.value * s.weightKg;
  }
  return v;
}
