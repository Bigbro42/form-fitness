import { describe, expect, it } from 'vitest';
import { builtinExercise, LIBRARY_EXERCISES, makeLookup } from '../src/domain/catalog';
import { exerciseCount, generate, recentlyTrained, rerollOne, seededRandom, type GeneratorSetup } from '../src/domain/generator';
import { exerciseSeries, loadLevel, muscleLoad, recentRecords, topExercises, totals, weekly, weekStart } from '../src/domain/progress';
import { addExercise, complete, createSession, newExercise, updateSet } from '../src/domain/session';
import type { WorkoutSession } from '../src/domain/types';

const lookup = makeLookup([]);

function done(date: string, id: string, sets: [number, number | null][], duration: number | null = 30): WorkoutSession {
  let s = createSession({ date, goal: null, now: new Date(`${date}T10:00:00`) });
  s = addExercise(s, newExercise(builtinExercise(id)!, null, sets.length));
  s.exercises[0]!.sets.forEach((set, i) => { s = updateSet(s, s.exercises[0]!.id, set.id, { value: sets[i]![0], weightKg: sets[i]![1] }); });
  return complete(s, { rpe: null, note: '', durationMin: duration }, new Date(`${date}T11:00:00`));
}

const sessions = [
  done('2026-10-05', 'hexbpress', [[10, 10], [8, 10]]),
  { ...done('2026-10-12', 'hexbpress', [[10, 12], [9, 12]]), durationMin: null },
  done('2026-10-26', 'hexbpress', [[8, 14]]),
  done('2026-10-27', 'plank', [[30, null], [45, null]]),
  { ...done('2026-10-28', 'squat', [[20, null]]), status: 'draft' as const }, // never counts
];

describe('progress', () => {
  it('buckets completed sessions into calendar weeks', () => {
    expect(weekStart('2026-10-29')).toBe('2026-10-26');
    const w = weekly(sessions, '2026-10-29', 4);
    expect(w.map((b) => b.start)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    expect(w.map((b) => b.sessions)).toEqual([1, 1, 0, 2]);
    expect(w[3]!.sets).toBe(3);
  });

  it('totals only completed sessions and reports missing durations', () => {
    const t = totals(sessions, '2026-10-01', '2026-10-31');
    expect(t).toEqual({ sessions: 4, sets: 7, minutes: 90, withoutDuration: 1, activeDays: 4 });
  });

  it('counts logged sets per muscle region, main and assisting separately', () => {
    const load = muscleLoad(sessions, lookup, '2026-10-01', '2026-10-31');
    expect(load.get('chest')).toMatchObject({ primarySets: 5, secondarySets: 0 });
    expect(load.get('triceps')!.secondarySets).toBe(5);
    expect(load.get('abs')!.primarySets).toBe(2);
    expect(load.get('quads')).toBeUndefined(); // the squat was only a draft
    expect([0, 1, 5, 6, 11, 12, 30].map(loadLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it('uses an honest measure per exercise type', () => {
    expect(exerciseSeries(sessions, 'hexbpress')).toMatchObject({ kind: 'heaviest', points: [{ value: 10 }, { value: 12 }, { value: 14, detail: '14 kg × 8' }] });
    expect(exerciseSeries(sessions, 'plank')).toMatchObject({ kind: 'bestTime', points: [{ value: 45 }] });
    expect(exerciseSeries(sessions, 'squat').points).toEqual([]);
  });

  it('lists records and most trained exercises', () => {
    expect(recentRecords(sessions).map((r) => [r.date, r.label])).toEqual([['2026-10-26', '14 kg × 8'], ['2026-10-12', '12 kg × 10']]);
    expect(topExercises(sessions, '2026-10-01')[0]).toMatchObject({ exerciseId: 'hexbpress', sessions: 3 });
  });
});

const base: GeneratorSetup = { focus: 'full', goal: 'health', durationMin: 30, equipment: ['body'], maxLevel: 2, count: null, respectRecovery: false };

describe('workout generator', () => {
  it('derives the number of exercises from duration and goal', () => {
    expect(exerciseCount(base)).toBe(6);
    expect(exerciseCount({ ...base, goal: 'strength', durationMin: 45 })).toBe(5);
    expect(exerciseCount({ ...base, durationMin: 10, goal: 'core' })).toBe(3);
    expect(exerciseCount({ ...base, count: 20 })).toBe(10);
  });

  it('builds a balanced full-body workout with only available equipment', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { items } = generate(LIBRARY_EXERCISES, base, { random: seededRandom(seed) });
      expect(items).toHaveLength(6);
      expect(new Set(items.map((x) => x.def.id)).size).toBe(6);
      expect(items.every((x) => x.def.equipment.includes('body') && x.def.level <= 2)).toBe(true);
      const patterns = items.map((x) => x.def.pattern);
      expect(patterns.some((p) => p === 'squat' || p === 'lunge')).toBe(true);
      expect(patterns.some((p) => p.startsWith('push'))).toBe(true);
      expect(patterns.some((p) => p.startsWith('pull') || p === 'hinge' || p === 'bridge')).toBe(true);
      expect(patterns.some((p) => p.startsWith('core'))).toBe(true);
      for (let i = 1; i < patterns.length; i++) expect(patterns[i], `seed ${seed}`).not.toBe(patterns[i - 1]);
    }
  });

  it('respects focus, goal and equipment', () => {
    const core = generate(LIBRARY_EXERCISES, { ...base, focus: 'core', goal: 'core' }, { random: seededRandom(3) }).items;
    expect(core.every((x) => x.def.pattern.startsWith('core') || x.def.pattern === 'bridge' || x.def.pattern === 'hinge')).toBe(true);
    const mob = generate(LIBRARY_EXERCISES, { ...base, focus: 'mobility', goal: 'mobility' }, { random: seededRandom(3) }).items;
    expect(mob.every((x) => x.def.pattern === 'mobility' || x.def.pattern === 'stretch')).toBe(true);
    const gym = generate(LIBRARY_EXERCISES, { ...base, focus: 'upper', goal: 'hypertrophy', equipment: ['body', 'dumbbell', 'machine'], maxLevel: 3 }, { random: seededRandom(3) }).items;
    expect(gym.some((x) => x.def.equipment.includes('dumbbell') || x.def.equipment.includes('machine'))).toBe(true);
    const cardio = generate(LIBRARY_EXERCISES, { ...base, goal: 'cardio', durationMin: 30 }, { random: seededRandom(5) }).items;
    expect(cardio.some((x) => x.def.kind === 'cardio')).toBe(true);
  });

  it('avoids recently trained muscles when asked', () => {
    const recent = recentlyTrained([done('2026-10-28', 'squat', [[15, null]])], lookup, '2026-10-29');
    expect([...recent].sort()).toEqual(['glutes', 'quads']);
    let hits = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { items } = generate(LIBRARY_EXERCISES, { ...base, focus: 'legs', respectRecovery: true }, { random: seededRandom(seed), recent });
      hits += items.filter((x) => x.def.primaryMuscles.includes('quads')).length;
    }
    let baseline = 0;
    for (let seed = 1; seed <= 30; seed++) {
      baseline += generate(LIBRARY_EXERCISES, { ...base, focus: 'legs' }, { random: seededRandom(seed) }).items.filter((x) => x.def.primaryMuscles.includes('quads')).length;
    }
    expect(hits).toBeLessThan(baseline);
  });

  it('reports when the equipment is too limited and rerolls single items', () => {
    const r = generate(LIBRARY_EXERCISES, { ...base, focus: 'pull', equipment: ['cardio'], count: 5 }, { random: seededRandom(1) });
    expect(r.shortBy).toBeGreaterThan(0);
    const { items } = generate(LIBRARY_EXERCISES, base, { random: seededRandom(2) });
    const next = rerollOne(LIBRARY_EXERCISES, base, items, 0, seededRandom(9));
    expect(next[0]!.def.id).not.toBe(items[0]!.def.id);
    expect(next[0]!.def.pattern).toBe(items[0]!.def.pattern);
    expect(next.slice(1)).toEqual(items.slice(1));
  });
});
