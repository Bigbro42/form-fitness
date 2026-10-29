import { describe, expect, it } from 'vitest';
import { builtinExercise } from '../src/domain/catalog';
import { exerciseHistory, personalBests, recordsIn, setsSummary, volumeKg } from '../src/domain/history';
import { recommend, restLabel } from '../src/domain/recommendations';
import {
  addExercise, addSet, applyPrevious, complete, createSession, discardCorrection, hasLoggedWork, LockedError,
  moveExercise, newExercise, park, removeExercise, removeSet, reopen, replaceExercise, resume, updateSet,
} from '../src/domain/session';
import type { WorkoutSession } from '../src/domain/types';

const squat = builtinExercise('squat')!;
const plank = builtinExercise('plank')!;
const press = builtinExercise('hexbpress')!;
const t = (min: number) => new Date(Date.UTC(2026, 9, 29, 16, min));

function logged(date: string, sets: [number, number | null][], exercise = press): WorkoutSession {
  let s = createSession({ date, goal: 'hypertrophy', now: t(0) });
  s = addExercise(s, newExercise(exercise, 'hypertrophy', sets.length), t(1));
  const ex = s.exercises[0]!;
  ex.sets.forEach((set, i) => { s = updateSet(s, ex.id, set.id, { value: sets[i]![0], weightKg: sets[i]![1], done: true }, t(2)); });
  return complete(s, { rpe: 7, note: '', durationMin: null }, t(30));
}

describe('session flow', () => {
  it('starts empty and active, without anything planned', () => {
    const s = createSession({ date: '2026-10-29', goal: null, now: t(0) });
    expect(s).toMatchObject({ status: 'active', exercises: [], completedAt: null, rev: 1 });
    expect(hasLoggedWork(s)).toBe(false);
  });

  it('adds exercises with the recommended number of sets and edits sets', () => {
    let s = createSession({ date: '2026-10-29', goal: 'strength', now: t(0) });
    s = addExercise(s, newExercise(squat, 'strength'));
    const ex = s.exercises[0]!;
    expect(ex.sets).toHaveLength(recommend(squat, 'strength').sets[0]);
    s = updateSet(s, ex.id, ex.sets[0]!.id, { value: 5, weightKg: 40, done: true });
    s = addSet(s, ex.id);
    expect(s.exercises[0]!.sets.at(-1)).toMatchObject({ value: null, weightKg: null });
    s = removeSet(s, ex.id, s.exercises[0]!.sets.at(-1)!.id);
    expect(s.exercises[0]!.sets[0]).toMatchObject({ value: 5, weightKg: 40, done: true });
    expect(hasLoggedWork(s)).toBe(true);
    expect(s.rev).toBeGreaterThan(1);
  });

  it('new sets take over the load of the previous set', () => {
    let s = addExercise(createSession({ date: '2026-10-29', goal: null }), newExercise(press, null, 1));
    const ex = s.exercises[0]!;
    s = updateSet(s, ex.id, ex.sets[0]!.id, { weightKg: 12.5 });
    s = addSet(s, ex.id);
    expect(s.exercises[0]!.sets[1]).toMatchObject({ value: null, weightKg: 12.5 });
  });

  it('reorders, replaces and removes exercises', () => {
    let s = createSession({ date: '2026-10-29', goal: null });
    s = addExercise(s, newExercise(squat, null));
    s = addExercise(s, newExercise(plank, null));
    const [a, b] = s.exercises;
    s = moveExercise(s, b!.id, -1);
    expect(s.exercises.map((x) => x.exerciseId)).toEqual(['plank', 'squat']);
    expect(moveExercise(s, b!.id, -1)).toBe(s); // already first
    s = updateSet(s, a!.id, a!.sets[0]!.id, { value: 12 });
    s = replaceExercise(s, a!.id, builtinExercise('lunge')!, null);
    expect(s.exercises[1]).toMatchObject({ id: a!.id, exerciseId: 'lunge', name: 'Reverse Lunges' });
    expect(s.exercises[1]!.sets[0]!.value).toBe(12); // same metric: values stay
    s = replaceExercise(s, a!.id, plank, null);
    expect(s.exercises[1]!.sets.every((x) => x.value === null)).toBe(true); // reps -> seconds: not carried over
    s = removeExercise(s, b!.id);
    expect(s.exercises).toHaveLength(1);
  });

  it('copies previous values only into empty sets', () => {
    let s = addExercise(createSession({ date: '2026-10-29', goal: null }), newExercise(press, null, 2));
    const ex = s.exercises[0]!;
    s = updateSet(s, ex.id, ex.sets[0]!.id, { value: 8, weightKg: 15 });
    const previous = logged('2026-10-20', [[10, 12.5], [9, 12.5], [8, 12.5]]).exercises[0]!.sets;
    s = applyPrevious(s, ex.id, previous);
    expect(s.exercises[0]!.sets.map((x) => [x.value, x.weightKg])).toEqual([[8, 15], [9, 12.5], [8, 12.5]]);
  });

  it('protects completed sessions until they are reopened on purpose', () => {
    const s = logged('2026-10-29', [[10, 20]]);
    expect(s).toMatchObject({ status: 'completed', completedAt: t(30).toISOString(), durationMin: 30, rpe: 7 });
    expect(() => addSet(s, s.exercises[0]!.id)).toThrow(LockedError);
    const open = reopen(s, t(90));
    const fixed = updateSet(open, open.exercises[0]!.id, open.exercises[0]!.sets[0]!.id, { value: 11 }, t(91));
    const done = complete(fixed, { rpe: 7, note: 'korrigiert', durationMin: null }, t(95));
    // A correction keeps the original time and duration.
    expect(done).toMatchObject({ status: 'completed', completedAt: t(30).toISOString(), durationMin: 30, note: 'korrigiert' });
    expect(done.exercises[0]!.sets[0]!.value).toBe(11);
    expect(done.reopened).toBeUndefined();
  });

  it('discards a correction completely', () => {
    const s = logged('2026-10-29', [[10, 20]]);
    const changed = updateSet(reopen(s), s.exercises[0]!.id, s.exercises[0]!.sets[0]!.id, { value: 99 });
    const back = discardCorrection(changed);
    expect(back.status).toBe('completed');
    expect(back.exercises[0]!.sets[0]!.value).toBe(10);
    expect(back.rev).toBeGreaterThan(changed.rev);
    expect(park(changed).exercises[0]!.sets[0]!.value).toBe(10);
  });

  it('parks an unfinished workout as draft and resumes it', () => {
    const s = addExercise(createSession({ date: '2026-10-29', goal: null }), newExercise(squat, null));
    const draft = park(s);
    expect(draft.status).toBe('draft');
    expect(resume(draft).status).toBe('active');
  });
});

describe('history and records', () => {
  const sessions = [
    logged('2026-10-01', [[10, 10], [8, 10]]),
    logged('2026-10-08', [[12, 10], [10, 12.5]]),
    { ...logged('2026-10-10', [[30, 50]]), status: 'draft' as const }, // never counts
  ];

  it('lists completed appearances newest first', () => {
    const h = exerciseHistory(sessions, 'hexbpress');
    expect(h.map((e) => e.session.date)).toEqual(['2026-10-08', '2026-10-01']);
    expect(setsSummary(h[0]!.sets, 'reps')).toBe('10 kg × 12 · 12,5 kg × 10');
  });

  it('computes personal bests from completed sessions only', () => {
    const pb = personalBests(exerciseHistory(sessions, 'hexbpress'), 'reps');
    expect(pb.heaviest).toMatchObject({ weightKg: 12.5, value: 10 });
    expect(pb.bestValue).toMatchObject({ value: 12 });
    expect(pb.bestSetVolume?.volume).toBe(125);
  });

  it('detects new records but not first attempts', () => {
    const next = logged('2026-10-15', [[8, 15]]);
    expect(recordsIn(next, [...sessions, next])).toEqual([{ exerciseId: 'hexbpress', name: 'Kurzhantel-Bankdrücken', kind: 'heaviest', label: '15 kg × 8' }]);
    const first = logged('2026-10-15', [[30, null]], plank);
    expect(recordsIn(first, [...sessions, first])).toEqual([]);
  });

  it('only counts load × reps as volume', () => {
    expect(volumeKg(sessions[1]!)).toBe(245);
    expect(volumeKg(logged('2026-10-15', [[60, null]], plank))).toBe(0);
  });
});

describe('recommendations', () => {
  it('depends on goal and exercise type', () => {
    expect(recommend(squat, 'strength')).toMatchObject({ target: [3, 6], metric: 'reps' });
    expect(recommend(squat, 'muscular').target[0]).toBeGreaterThanOrEqual(15);
    expect(recommend(squat, 'hypertrophy').target).toEqual([6, 15]);
    expect(recommend(plank, 'core')).toMatchObject({ metric: 'seconds' });
    const run = builtinExercise(['run', 'jog', 'cycling', 'rowerg', 'jumprope'].find((id) => builtinExercise(id)?.kind === 'cardio') ?? '') ?? { kind: 'cardio' as const, metric: 'minutes' as const };
    expect(recommend(run, 'cardio')).toMatchObject({ metric: 'minutes', sets: [1, 1], restSeconds: [0, 0] });
    expect(recommend(squat, null)).toEqual(recommend(squat, 'health'));
  });

  it('formats rest times readably', () => {
    expect(restLabel([120, 240])).toBe('2–4 Min. Pause');
    expect(restLabel([60, 90])).toBe('60–90 Sek. Pause');
    expect(restLabel([0, 0])).toBe('Keine Satzpause');
  });
});
