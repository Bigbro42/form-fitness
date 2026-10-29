import { describe, expect, it } from 'vitest';
import { occurrencesBetween, occursOn } from '../src/domain/recurrence';
import type { PlannedWorkout, Recurrence } from '../src/domain/types';

const plan = (startsOn: string, recurrence: Recurrence, exceptions: PlannedWorkout['exceptions'] = {}): PlannedWorkout => ({
  id: 'p', title: 'Test', activity: 'strength', startsOn, time: null, recurrence, exercises: [], goal: null, exceptions, rev: 0, updatedAt: '',
});
const dates = (p: PlannedWorkout, from: string, to: string) => occurrencesBetween(p, from, to).map((o) => o.date);

describe('recurrence', () => {
  it('repeats weekly across month and year boundaries', () => {
    const p = plan('2026-12-21', { freq: 'weekly', interval: 1, until: null });
    expect(dates(p, '2026-12-01', '2027-01-31')).toEqual(['2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25']);
  });

  it('repeats every two weeks', () => {
    const p = plan('2026-10-07', { freq: 'weekly', interval: 2, until: null });
    expect(dates(p, '2026-10-01', '2026-11-15')).toEqual(['2026-10-07', '2026-10-21', '2026-11-04']);
  });

  it('keeps the weekday across the daylight saving change', () => {
    const p = plan('2026-10-19', { freq: 'weekly', interval: 1, until: null });
    expect(dates(p, '2026-10-19', '2026-11-02')).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
  });

  it('repeats monthly on the same day and skips months without it', () => {
    const p = plan('2026-10-31', { freq: 'monthly', interval: 1, until: null });
    expect(dates(p, '2026-10-01', '2027-03-31')).toEqual(['2026-10-31', '2026-12-31', '2027-01-31', '2027-03-31']);
  });

  it('stops at the end date', () => {
    const p = plan('2026-11-02', { freq: 'weekly', interval: 1, until: '2026-11-16' });
    expect(dates(p, '2026-11-01', '2026-12-31')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  });

  it('skips a single occurrence', () => {
    const p = plan('2026-11-02', { freq: 'weekly', interval: 1, until: null }, { '2026-11-09': { type: 'skip' } });
    expect(dates(p, '2026-11-01', '2026-11-20')).toEqual(['2026-11-02', '2026-11-16']);
    expect(occursOn(p, '2026-11-09')).toBe(false);
  });

  it('moves a single occurrence, also into the next month', () => {
    const p = plan('2026-11-02', { freq: 'weekly', interval: 1, until: null }, { '2026-11-30': { type: 'move', to: '2026-12-01' } });
    expect(occurrencesBetween(p, '2026-11-25', '2026-12-08')).toEqual([
      { original: '2026-11-30', date: '2026-12-01' },
      { original: '2026-12-07', date: '2026-12-07' },
    ]);
  });

  it('handles one-off entries', () => {
    const p = plan('2026-11-05', { freq: 'once' });
    expect(dates(p, '2026-11-01', '2026-11-30')).toEqual(['2026-11-05']);
    expect(dates(p, '2026-11-06', '2026-11-30')).toEqual([]);
  });
});
