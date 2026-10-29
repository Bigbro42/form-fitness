import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import {
  agenda, createPlan, describeRecurrence, detachOccurrence, endSeriesBefore, monthGrid, moveOccurrence,
  recurrenceFor, repeatChoice, restoreOccurrence, shiftMonth, skipOccurrence, templateFromSession, updateSeries, upcoming, type PlanInput,
} from '../src/domain/calendar';
import { builtinExercise } from '../src/domain/catalog';
import { addExercise, complete, createSession, newExercise, updateSet } from '../src/domain/session';
import type { WorkoutSession } from '../src/domain/types';
import { openFormDb, readUserData } from '../src/db/db';

const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  title: 'Beine', activity: 'strength', startsOn: '2026-11-02', time: '18:00', recurrence: recurrenceFor('weekly', null), exercises: [{ exerciseId: 'squat', sets: 3 }], goal: 'strength', ...over,
});
const days = (m: Map<string, unknown[]>) => [...m.keys()].sort();

function doneFor(planId: string, occurrence: string, date = occurrence): WorkoutSession {
  let s = createSession({ date, goal: null, source: 'calendar' });
  s = { ...s, plannedRef: { planId, occurrence } };
  s = addExercise(s, newExercise(builtinExercise('squat')!, null, 1));
  s = updateSet(s, s.exercises[0]!.id, s.exercises[0]!.sets[0]!.id, { value: 10 });
  return complete(s, { rpe: null, note: '', durationMin: 20 });
}

describe('calendar', () => {
  it('starts empty: no plans means no entries', () => {
    expect(agenda([], [], '2026-11-01', '2026-11-30', '2026-11-01').size).toBe(0);
  });

  it('describes repeats in plain German', () => {
    expect(describeRecurrence(createPlan(input()))).toBe('Jeden Montag');
    expect(describeRecurrence(createPlan(input({ recurrence: recurrenceFor('biweekly', '2026-12-31') })))).toBe('Jeden zweiten Montag bis 31. Dez. 2026');
    expect(describeRecurrence(createPlan(input({ recurrence: recurrenceFor('monthly', null) })))).toBe('Monatlich am 2.');
    expect(repeatChoice(recurrenceFor('biweekly', null))).toBe('biweekly');
  });

  it('a planned occurrence is never "done" without a completed session', () => {
    const p = createPlan(input());
    const a = agenda([p], [], '2026-11-01', '2026-11-30', '2026-11-10');
    expect(days(a)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    const status = (d: string) => (a.get(d)![0] as { status: string }).status;
    expect(status('2026-11-02')).toBe('missed');
    expect(status('2026-11-16')).toBe('planned');

    const withSession = agenda([p], [doneFor(p.id, '2026-11-09', '2026-11-10')], '2026-11-01', '2026-11-30', '2026-11-10');
    expect((withSession.get('2026-11-09')![0] as { status: string }).status).toBe('done');
    // The session belongs to the occurrence, so it is not listed a second time on the 10th.
    expect(withSession.get('2026-11-10')).toBeUndefined();
  });

  it('skips, restores and moves single occurrences, also across months', () => {
    let p = createPlan(input());
    p = skipOccurrence(p, '2026-11-09');
    p = moveOccurrence(p, '2026-11-30', '2026-12-01');
    const a = agenda([p], [], '2026-11-01', '2026-12-08', '2026-11-01', true);
    expect(days(a)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-12-01', '2026-12-07']);
    expect((a.get('2026-11-09')![0] as { status: string }).status).toBe('skipped');
    expect((a.get('2026-12-01')![0] as { original: string }).original).toBe('2026-11-30');
    p = restoreOccurrence(p, '2026-11-09');
    expect(agenda([p], [], '2026-11-09', '2026-11-09', '2026-11-01').size).toBe(1);
  });

  it('changes one occurrence without touching the series', () => {
    const p = createPlan(input());
    const [series, single] = detachOccurrence(p, '2026-11-16', input({ title: 'Beine leicht', startsOn: '2026-11-17', time: null }));
    const a = agenda([series, single], [], '2026-11-09', '2026-11-23', '2026-11-01', true);
    expect(days(a)).toEqual(['2026-11-09', '2026-11-17', '2026-11-23']); // detached skip is not shown as "skipped"
    expect((a.get('2026-11-17')![0] as { plan: { title: string } }).plan.title).toBe('Beine leicht');
    expect(series.title).toBe('Beine');
  });

  it('edits and ends a whole series', () => {
    let p = skipOccurrence(createPlan(input()), '2026-11-09');
    p = updateSeries(p, input({ startsOn: '2026-11-03', title: 'Beine & Po' }));
    expect(p.exceptions).toEqual({}); // 9th is no longer an occurrence (series moved to Tuesday)
    expect(p.title).toBe('Beine & Po');
    const ended = endSeriesBefore(p, '2026-11-17')!;
    expect(days(agenda([ended], [], '2026-11-01', '2026-12-31', '2026-11-01'))).toEqual(['2026-11-03', '2026-11-10']);
    expect(endSeriesBefore(p, '2026-11-03')).toBeNull();
  });

  it('lists upcoming occurrences that are not done yet', () => {
    const p = createPlan(input());
    const up = upcoming([p], [doneFor(p.id, '2026-11-02')], '2026-11-02', 2);
    expect(up.map((e) => e.date)).toEqual(['2026-11-09', '2026-11-16']);
  });

  it('builds a Monday-first month grid', () => {
    const g = monthGrid('2026-11');
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-10-26');
    expect(g).toContain('2026-11-30');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('saves a session as template without values', () => {
    const t = templateFromSession(doneFor('x', '2026-11-02'), 'Mein Beintag');
    expect(t).toMatchObject({ name: 'Mein Beintag', exercises: [{ exerciseId: 'squat', sets: 1 }] });
  });
});

describe('database upgrade', () => {
  it('upgrades a version 1 database without losing data', async () => {
    const name = 'upgrade-test';
    const v1 = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('date', 'date');
        db.createObjectStore('plans', { keyPath: 'id' });
        db.createObjectStore('exercises', { keyPath: 'id' });
        db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('takenAt', 'takenAt');
        db.createObjectStore('kv');
      },
    });
    await v1.put('sessions', doneFor('p', '2026-10-01'));
    await v1.put('plans', createPlan(input()));
    v1.close();
    const db = await openFormDb(name);
    const data = await readUserData(db);
    expect(data.sessions).toHaveLength(1);
    expect(data.plans).toHaveLength(1);
    expect(data.templates).toEqual([]);
    db.close();
  });
});
