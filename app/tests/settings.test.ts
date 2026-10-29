import { describe, expect, it } from 'vitest';
import { GOAL_IDS, goalRole, normalizeGoals, orderGoals } from '../src/domain/goals';
import { normalizeSettings } from '../src/domain/settings';
import { DEFAULT_SETTINGS } from '../src/domain/types';

describe('long-term goals', () => {
  it('keeps one main goal and up to two other secondary goals', () => {
    expect(normalizeGoals('hypertrophy', ['core', 'hypertrophy', 'core', 'mobility', 'cardio'])).toEqual({ primaryGoal: 'hypertrophy', secondaryGoals: ['core', 'mobility'] });
  });

  it('drops unknown goals and secondary goals without a main goal', () => {
    expect(normalizeGoals('fly', ['core'])).toEqual({ primaryGoal: null, secondaryGoals: [] });
    expect(normalizeGoals(null, ['core'])).toEqual({ primaryGoal: null, secondaryGoals: [] });
    expect(normalizeGoals('core', 'mobility')).toEqual({ primaryGoal: 'core', secondaryGoals: [] });
    expect(normalizeGoals('core', ['nope', 'mobility'])).toEqual({ primaryGoal: 'core', secondaryGoals: ['mobility'] });
  });

  it('lists the own goals first and every goal exactly once', () => {
    const { mine, others } = orderGoals('strength', ['mobility', 'core']);
    expect(mine).toEqual(['strength', 'mobility', 'core']);
    expect([...mine, ...others].sort()).toEqual([...GOAL_IDS].sort());
    expect(orderGoals(null, [])).toEqual({ mine: [], others: GOAL_IDS });
  });

  it('labels main and secondary goals', () => {
    expect(goalRole('strength', 'strength', ['core'])).toBe('Hauptziel');
    expect(goalRole('core', 'strength', ['core'])).toBe('Nebenziel');
    expect(goalRole('cardio', 'strength', ['core'])).toBeNull();
    expect(goalRole('core', null, ['core'])).toBeNull();
  });
});

describe('settings', () => {
  it('fills missing fields of older versions with defaults', () => {
    expect(normalizeSettings({ primaryGoal: 'core', equipment: ['body', 'dumbbell'] })).toEqual({ ...DEFAULT_SETTINGS, primaryGoal: 'core', equipment: ['body', 'dumbbell'] });
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs broken values from backup files instead of failing', () => {
    const s = normalizeSettings({ primaryGoal: 'core', secondaryGoals: 'x' as never, equipment: ['laser'] as never, restAuto: 'yes' as never, level: 7 as never, sessionMinutes: 999, restSeconds: -5 });
    expect(s.secondaryGoals).toEqual([]);
    expect(s.equipment).toEqual(DEFAULT_SETTINGS.equipment);
    expect(s.restAuto).toBe(true);
    expect(s.level).toBeNull();
    expect(s.sessionMinutes).toBe(60);
    expect(s.restSeconds).toBe(DEFAULT_SETTINGS.restSeconds);
  });

  it('rounds the time budget to 5-minute steps within 10–60', () => {
    expect(normalizeSettings({ sessionMinutes: 17 }).sessionMinutes).toBe(15);
    expect(normalizeSettings({ sessionMinutes: 3 }).sessionMinutes).toBe(10);
    expect(normalizeSettings({ sessionMinutes: null }).sessionMinutes).toBeNull();
  });
});
